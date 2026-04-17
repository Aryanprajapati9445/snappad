import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { verifyGoogleIdToken, verifyGoogleAccessToken } from '../services/google.service';
import { sendPasswordResetEmail } from '../services/email.service';

/** Hash a token for safe DB storage */
const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateTokens = (userId: string, email: string, role: string) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET!;
  const refreshSecret = process.env.JWT_REFRESH_SECRET!;

  const accessToken = jwt.sign({ id: userId, email, role }, accessSecret, {
    expiresIn: '1d',
  });
  const refreshToken = jwt.sign({ id: userId, email, role }, refreshSecret, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};

const setTokenCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    // Use 'none' in prod so cookies are sent cross-site (CloudFront → EC2 backend).
    // 'none' requires secure:true, which is enforced above in prod. Use 'lax' in dev.
    sameSite: isProd ? ('none' as const) : ('lax' as const),
  };

  // Cookie maxAge matches JWT expiry (1d access, 7d refresh)
  res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 1 * 24 * 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

/** Shared cookie options for clearCookie — must match setTokenCookies flags */
const getCookieOpts = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
  };
};

export const register = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      next(createError('An account with this email already exists', 409));
      return;
    }

    const user = await User.create({ name, email, password });
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    // Store hashed refresh token (never store plain tokens in DB)
    user.refreshToken = hashToken(refreshToken);
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      next(createError('Invalid email or password', 401));
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      next(createError('Invalid email or password', 401));
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    user.refreshToken = hashToken(refreshToken);
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    res.json({
      success: true,
      data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      req.user.refreshToken = undefined;
      await req.user.save({ validateBeforeSave: false });
    }

    const cookieOpts = getCookieOpts();
    res.clearCookie('accessToken', cookieOpts);
    res.clearCookie('refreshToken', cookieOpts);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Accept refresh token from cookie (web) or request body (extension — can't read httpOnly cookies)
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      next(createError('No refresh token', 401));
      return;
    }

    const secret = process.env.JWT_REFRESH_SECRET!;
    const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string };

    const user = await User.findById(decoded.id).select('+refreshToken');
    // Compare the incoming token's hash against the stored hash
    if (!user || user.refreshToken !== hashToken(token)) {
      next(createError('Invalid refresh token', 401));
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
    user.refreshToken = hashToken(refreshToken);
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, accessToken, refreshToken);

    // Also include tokens in body so the browser extension can access them
    // (extensions cannot read httpOnly cookies)
    const usedBodyToken = !req.cookies?.refreshToken && !!req.body?.refreshToken;
    res.json({
      success: true,
      data: {
        accessToken,
        // Only expose refresh token in body when the request came via body (extension)
        ...(usedBodyToken && { refreshToken }),
      },
    });
  } catch (error) {
    next(createError('Invalid or expired refresh token', 401));
  }
};


/** Shared helper: find or create a user by Google profile, then issue tokens */
async function handleGoogleUser(
  profile: { googleId: string; email: string; name: string; picture?: string },
  res: Response
) {
  let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] });

  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      googleId: profile.googleId,
      picture: profile.picture,
    });
  } else if (!user.googleId) {
    // Existing email/password account — link Google ID
    user.googleId = profile.googleId;
    if (profile.picture) user.picture = profile.picture;
    await user.save({ validateBeforeSave: false });
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  setTokenCookies(res, accessToken, refreshToken);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, picture: user.picture },
    accessToken,
    // Expose refreshToken in body so the browser extension (which cannot read httpOnly cookies)
    // can persist it in chrome.storage.local for silent token renewal.
    refreshToken,
  };
}

/** POST /api/auth/google — Web: verifies Google ID token from GSI / One Tap */
export const googleAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential) {
      next(createError('Google credential is required', 400));
      return;
    }
    const profile = await verifyGoogleIdToken(credential);
    const { user, accessToken, refreshToken } = await handleGoogleUser(profile, res);
    res.json({
      success: true,
      message: 'Google login successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[googleAuth] Google ID token verification failed:', msg);
    next(createError(`Google authentication failed: ${msg}`, 401));
  }
};

/** POST /api/auth/google-token — Extension: verifies Google access token from chrome.identity */
export const googleTokenAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { accessToken: googleAccessToken } = req.body;
    if (!googleAccessToken) {
      next(createError('Google access token is required', 400));
      return;
    }
    const profile = await verifyGoogleAccessToken(googleAccessToken);
    const { user, accessToken, refreshToken } = await handleGoogleUser(profile, res);
    res.json({
      success: true,
      message: 'Google login successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[googleTokenAuth] Google access token verification failed:', msg);
    next(createError(`Google authentication failed: ${msg}`, 401));
  }
};

/** POST /api/auth/change-password — Authenticated: change password */
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      next(createError('Current and new password are required', 400));
      return;
    }
    if (newPassword.length < 8) {
      next(createError('New password must be at least 8 characters', 400));
      return;
    }

    const user = await User.findById(req.user!._id).select('+password');
    if (!user) { next(createError('User not found', 404)); return; }

    // Google-only accounts have no password
    if (!user.password) {
      next(createError('This account uses Google sign-in and has no password to change', 400));
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) { next(createError('Current password is incorrect', 401)); return; }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

/** POST /api/auth/forgot-password — public: send reset email */
export const forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { next(createError('Email is required', 400)); return; }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Tell the user clearly if the email is not registered
    if (!user) {
      next(createError('No account found with that email address', 404));
      return;
    }

    // Google-only accounts can use this flow to set a password for the first time
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    console.log(`📧 Attempting to send password reset email to ${user.email}`);
    console.log(`   Reset URL: ${resetUrl}`);

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailErr) {
      console.error('❌ Email sending failed:', emailErr instanceof Error ? emailErr.message : emailErr);
      // Roll back token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      next(createError('Failed to send reset email. Please check server logs and SMTP configuration.', 500));
      return;
    }

    res.json({ success: true, message: 'Reset link sent! Check your inbox.' });
  } catch (error) {
    next(error);
  }
};

/** POST /api/auth/reset-password — public: set new password via token */
export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      next(createError('Token and new password are required', 400));
      return;
    }
    if (newPassword.length < 8) {
      next(createError('Password must be at least 8 characters', 400));
      return;
    }

    // Hash the incoming plain token and compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      next(createError('Reset link is invalid or has expired', 400));
      return;
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
