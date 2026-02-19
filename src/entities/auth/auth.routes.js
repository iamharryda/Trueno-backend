import express from 'express';
import {
  initiateRegisterUser,
  verifyRegisterOTP,
  loginUser,
  refreshAccessToken,
  forgetPassword,
  verifyCode,
  resetPassword,
  changePassword,
  logoutUser,
  socialLogin
} from './auth.controller.js';
import { userAdminMiddleware, verifyToken } from '../../core/middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register/init', initiateRegisterUser);     
router.post('/register/verify', verifyRegisterOTP);     
router.post('/login', loginUser);
router.post('/refresh-access-token', refreshAccessToken);
router.post('/forget-password', forgetPassword);
router.post('/verify-code', verifyCode);
router.post('/reset-password', resetPassword);
router.post('/change-password',verifyToken, changePassword);
router.post('/logout', verifyToken, userAdminMiddleware, logoutUser);

// Social login route
router.post('/social-login', socialLogin);

export default router;
