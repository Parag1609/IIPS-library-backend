import express from 'express';
import {
  login,
  getMe,
  logout,
  changePassword,
  forgotPassword,          
  resetPassword,
  checkAdminExists      
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/loginLimiter.js';

const router = express.Router();

router.post('/login',loginLimiter, login);
router.get('/me', protect, getMe);
router.get('/admin-exists', checkAdminExists);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password', resetPassword);

export default router;
