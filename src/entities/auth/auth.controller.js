import { generateResponse } from '../../lib/responseFormate.js';
import User from './auth.model.js';
import {
  loginUserService,
  refreshAccessTokenService,
  forgetPasswordService,
  verifyCodeService,
  resetPasswordService,
  changePasswordService,
  initiateRegisterUserService,
  verifyRegisterOTPService,
  socialLoginService
} from './auth.service.js';


export const initiateRegisterUser = async (req, res, next) => {
  try {
    const { name, phoneNumber, email, password } = req.body;
    await initiateRegisterUserService({ name, phoneNumber, email, password });
    generateResponse(res, 200, true, 'OTP sent to email', null);
  } catch (error) {
    if (error.message === 'User already verified') {
      generateResponse(res, 400, false, 'User already registered.', null);
    } else {
      next(error);
    }
  }
};


export const verifyRegisterOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await verifyRegisterOTPService(email, otp);
    generateResponse(res, 200, true, 'User verified successfully', user);
  } catch (error) {
    generateResponse(res, 400, false, error.message, null);
  }
};


export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const data = await loginUserService({ email, password })

    generateResponse(res, 200, true, 'Login successful', data);
  }

  catch (error) {
    if (error.message === 'Email and password are required') {
      generateResponse(res, 400, false, 'Email and password are required', null);
    }

    else if (error.message === 'User not found') {
      generateResponse(res, 404, false, 'User not found', null);
    }

    else if (error.message === 'Invalid password') {
      generateResponse(res, 400, false, 'Invalid password', null);
    }

    else {
      next(error)
    }
  }
};


export const refreshAccessToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  try {
    const tokens = await refreshAccessTokenService(refreshToken);
    generateResponse(res, 200, true, 'Token refreshed', tokens);
  }

  catch (error) {
    if (error.message === 'No refresh token provided') {
      generateResponse(res, 400, false, 'No refresh token provided', null);
    }

    else if (error.message === 'Invalid refresh token') {
      generateResponse(res, 400, false, 'Invalid refresh token', null);
    }

    else {
      next(error)
    }
  }
};


export const forgetPassword = async (req, res, next) => {

  const { email } = req.body;
  try {
    await forgetPasswordService(email);
    generateResponse(res, 200, true, 'Verification code sent to your email', null);
  }

  catch (error) {

    if (error.message === 'Email is required') {
      generateResponse(res, 400, false, 'Email is required', null);
    }

    else if (error.message === 'Invalid email') {
      generateResponse(res, 400, false, 'Invalid email', null);
    }

    else {
      next(error)
    }
  }
};


export const verifyCode = async (req, res, next) => {
  const { otp, email } = req.body;
  try {
    await verifyCodeService({ otp, email });
    generateResponse(res, 200, true, 'Verification successful', null);
  }

  catch (error) {
    if (error.message === 'Email and otp are required') {
      generateResponse(res, 400, false, 'Email and otp is required', null);
    }

    else if (error.message === 'Invalid email') {
      generateResponse(res, 400, false, 'Invalid email', null);
    }

    else if (error.message === 'Otp not found') {
      generateResponse(res, 404, false, 'Otp not found', null);
    }

    else if (error.message === 'Invalid or expired otp') {
      generateResponse(res, 403, false, 'Invalid or expired otp', null);
    }

    else {
      next(error)
    }
  }
};


export const resetPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;
  try {
    await resetPasswordService({ email, newPassword });
    generateResponse(res, 200, true, 'Password reset successfully', null);
  }

  catch (error) {
    if (error.message === 'Email and new password are required') {
      generateResponse(res, 400, false, 'Email and new password are required', null);
    }

    else if (error.message === 'Invalid email') {
      generateResponse(res, 400, false, 'Invalid email', null);
    }

    else if (error.message === 'otp not cleared') {
      generateResponse(res, 403, false, 'otp not cleared', null);
    }

    else {
      next(error)
    }
  }
};


export const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user._id;
  try {
    await changePasswordService({ userId, oldPassword, newPassword });
    generateResponse(res, 200, true, 'Password changed successfully', null);
  }

  catch (error) {
    if (error.message === 'Old and new passwords are required') {
      generateResponse(res, 400, false, 'Old and new passwords are required', null);
    }

    else if (error.message === 'Password does not match') {
      generateResponse(res, 400, false, 'Password does not match', null);
    }

    else {
      next(error)
    }
  }
};


export const logoutUser = async (req, res, next) => {

  const userId = req.user._id;
  try {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    generateResponse(res, 200, true, 'Logged out successfully', null);
  }

  catch (error) {
    next(error);
  }
};

export const socialLogin = async (req, res, next) => {
  try {
    console.log('Social login request:', req.body);
    const { provider, providerId, email, name, profileImage } = req.body;
    const data = await socialLoginService({ provider, providerId, email, name, profileImage });
    console.log('Social login response:', data);
    generateResponse(res, 200, true, 'Social login successful', data);
  } catch (error) {
    console.error('Social login error:', error);
    generateResponse(res, 400, false, error.message, null);
  }
};
