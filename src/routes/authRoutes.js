import express from 'express';
import {
  login,
  getMe,
  logout,
  changePassword,
  forgotPassword,          
  resetPassword      
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password', resetPassword);

export default router;
