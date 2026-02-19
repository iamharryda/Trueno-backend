import User from './auth.model.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../../lib/sendEmail.js';
import verificationCodeTemplate from '../../lib/emailTemplates.js';
import {accessTokenSecrete,emailExpires, accessTokenExpires, refreshTokenSecrete, refreshTokenExpires } from '../../core/config/config.js';


export const initiateRegisterUserService = async ({ name, phoneNumber, email, password }) => {
  const existingUser = await User.findOne({ email });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 

  if (existingUser) {
    if (existingUser.isVerified) {
      throw new Error('User already verified');
    }

    // User exists but not verified → update OTP
    existingUser.otp = otp;
    existingUser.otpExpires = otpExpires;
    existingUser.name = name; 
    existingUser.phoneNumber = phoneNumber;
    existingUser.password = password; 
    await existingUser.save();
  } 
  else {
    const newUser = new User({
      name,
      phoneNumber,
      email,
      password,
      otp,
      otpExpires
    });
    await newUser.save();
  }

  await sendEmail({
    to: email,
    subject: 'Your OTP Code',
    html: `<p>Your verification code is: <strong>${otp}</strong></p>`
  });
};


export const verifyRegisterOTPService = async (email, otp) => {
  const user = await User.findOne({ email });

  if (!user) throw new Error('User not found');
  if (user.isVerified) throw new Error('User already verified');
  if (user.otp !== otp) throw new Error('Invalid OTP');
  if (user.otpExpires < new Date()) throw new Error('OTP expired');

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;

  await user.save();

  const { _id, role, profileImage, name, phoneNumber } = user;
  return { _id, email, role, profileImage, name, phoneNumber };
};


export const loginUserService = async ({ email, password }) => {
  if (!email || !password) throw new Error('Email and password are required');

  const user = await User.findOne({ email }).select("_id name email role profileImage password isVerified refreshToken updatedAt");

  if (!user) throw new Error('User not found');
  if (!user.isVerified) throw new Error('Please verify your email before logging in');

  const isMatch = await user.comparePassword(user._id, password);
  if (!isMatch) throw new Error('Invalid password');

  const payload = { _id: user._id, role: user.role };

  const accessToken = user.generateAccessToken(payload);
  const refreshToken = user.generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    user: {
      _id: user._id,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      refreshToken,
      updatedAt: user.updatedAt,
    },
    accessToken
  };
};


export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) throw new Error('No refresh token provided');

  const user = await User.findOne({ refreshToken });

  if (!user) throw new Error('Invalid refresh token');

  const decoded = jwt.verify(refreshToken, refreshTokenSecrete)

  if (!decoded || decoded._id !== user._id.toString()) throw new Error('Invalid refresh token')

  const payload = { _id: user._id , role: user.role }

  const accessToken = user.generateAccessToken(payload);
  const newRefreshToken = user.generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false })

  return {
    accessToken,
    refreshToken: newRefreshToken
  }
};


export const forgetPasswordService = async (email) => {

  if (!email) throw new Error('Email is required')

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpires = new Date(Date.now() + emailExpires);

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: email,
    subject: 'Password Reset OTP',
    html: verificationCodeTemplate(otp)
  });

  return;
};


export const verifyCodeService = async ({ email, otp }) => {

  if (!email || !otp) throw new Error('Email and otp are required')

  const user = await User.findOne({ email });

  if (!user) throw new Error('Invalid email');

  if (!user.otp || !user.otpExpires) throw new Error('Otp not found');

  if (parseInt(user.otp, 10) !== parseInt(otp, 10) || Date.now() > user.otpExpires.getTime()) throw new Error('Invalid or expired otp')

  user.otp = null;
  user.otpExpires = null;
  await user.save({ validateBeforeSave: false });

  return;
};


export const resetPasswordService = async ({ email, newPassword }) => {
  if (!email || !newPassword) throw new Error('Email and new password are required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  if (user.otp || user.otpExpires) throw new Error('otp not cleared');

  user.password = newPassword;
  await user.save();

  return;
};


export const changePasswordService = async ({ userId, oldPassword, newPassword }) => {
  if (!userId || !oldPassword || !newPassword) throw new Error('User id, old password and new password are required');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(userId, oldPassword);
  if (!isMatch) throw new Error('Invalid old password');

  user.password = newPassword;
  await user.save();

  return;
};


export const socialLoginService = async ({ provider, providerId, email, name, profileImage }) => {
  if (!provider || !providerId || !email) {
    throw new Error('Missing required social login fields');
  }

  // Try to find user by providerId or email
  let user = await User.findOne({ $or: [
    { [`${provider}Id`]: providerId },
    { email }
  ] });

  // If not found, create new user
  if (!user) {
    user = new User({
      name,
      email,
      profileImage,
      [`${provider}Id`]: providerId,
      isVerified: true,
      password: providerId // Not used, but required by schema
    });
    await user.save();
  } else if (!user[`${provider}Id`]) {
    // If user exists but doesn't have this providerId, add it
    user[`${provider}Id`] = providerId;
    await user.save();
  }

  // Generate tokens
  const payload = { _id: user._id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, accessTokenSecrete, { expiresIn: accessTokenExpires });
  const refreshToken = jwt.sign(payload, refreshTokenSecrete, { expiresIn: refreshTokenExpires });

  return {
    user,
    accessToken,
    refreshToken
  };
};
