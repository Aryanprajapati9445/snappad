import { Router } from 'express';
import {
  register, login, getMe, logout, refresh,
  googleAuth, googleTokenAuth, changePassword,
  forgotPassword, resetPassword,
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../utils/schemas';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/google', googleAuth);
router.post('/google-token', googleTokenAuth);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/refresh', refresh);
router.post('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
