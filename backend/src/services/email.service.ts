import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS via STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.error('Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env');
  } else {
    console.log('✅ SMTP connection verified successfully');
  }
});

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const fromName = process.env.EMAIL_FROM || 'Snappad <no-reply@snappad.app>';

  try {
    await transporter.sendMail({
      from: fromName,
      to,
      subject: 'Reset your Snappad password',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#f1f5f9;border-radius:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;">
              <span style="font-size:16px;">✦</span>
            </div>
            <span style="font-size:18px;font-weight:700;background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Snappad</span>
          </div>

          <h1 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#f1f5f9;">Reset your password</h1>
          <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:24px;">
            We received a request to reset the password for your Snappad account. 
            Click the button below to choose a new password. This link is valid for <strong style="color:#f1f5f9;">15 minutes</strong>.
          </p>

          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
            Reset Password
          </a>

          <p style="font-size:12px;color:#64748b;margin-top:28px;line-height:1.6;">
            If you didn't request this, you can safely ignore this email — your password won't change.<br><br>
            Or copy this link into your browser:<br>
            <a href="${resetUrl}" style="color:#60a5fa;word-break:break-all;">${resetUrl}</a>
          </p>
        </div>
      `,
      text: `Reset your Snappad password\n\nClick the link below (valid 15 min):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    });
    console.log(`✅ Password reset email sent to ${to}`);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error instanceof Error ? error.message : error);
    throw error;
  }
}
