import { createFilter, createPaginationInfo } from "../../lib/pagination.js";
import cloudinary, { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import User from "../auth/auth.model.js";
import RoleType from "../../lib/types.js";
import fs from "fs";


// Get all users
export const getAllUsers = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  const totalUsers = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const paginationInfo = createPaginationInfo(page, limit, totalUsers);
  return { users, paginationInfo };
};


// Get all admins
export const getAllAdmins = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  const totalAdmins = await User.countDocuments({ ...filter, role: RoleType.ADMIN });
  const admins = await User.find({ ...filter, role: RoleType.ADMIN })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const paginationInfo = createPaginationInfo(page, limit, totalAdmins);
  return { admins, paginationInfo };
};


// Get all sellers 
export const getAllSellers = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  const totalSellers = await User.countDocuments({ ...filter, role: RoleType.SELLER });
  const sellers = await User.find({ ...filter, role: RoleType.SELLER })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const paginationInfo = createPaginationInfo(page, limit, totalSellers);
  return { sellers, paginationInfo };
};


// Get user by ID
export const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};


// Update user
export const updateUser = async ({ id, ...updateData }) => {
  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  if (!updatedUser) {
    throw new Error('User not found');
  }
  return updatedUser;
};


// Delete user
export const deleteUser = async (userId) => {
  const deletedUser = await User.findByIdAndDelete(userId);
  if (!deletedUser) {
    throw new Error('User not found');
  }
  return true;
};


// Upload avatar
export const createAvatarProfile = async (id, files) => {

  const userFound = await User.findById({_id: id});

  if (!userFound) throw new Error('User not found');

  const profileImage = files.profileImage[0];
  
  // Generate secure filename
  const sanitizedTitle = `${userFound._id}-${Date.now()}`; 
  let cloudinaryResult;

  try {
    cloudinaryResult = await cloudinaryUpload(profileImage.path, sanitizedTitle, "user-profile");
    if (!cloudinaryResult?.url) throw new Error('Cloudinary upload failed');

    // Update user 
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { profileImage: cloudinaryResult.url },
      { new: true }
    ).select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

    return updatedUser;
  } catch (error) {
    console.error('Error in createAvatarProfile:', error);
    throw error;
  } finally {
    // Always clean up temp file
    fs.unlink(profileImage.path, () => {}); 
  }
};


// Upload avatar profile
export const updateAvatarProfile = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.profileImage || files.profileImage.length === 0) {
    throw new Error('Profile image is required');
  }

  const profileImage = files.profileImage[0];

  if (userFound.profileImage) {
    const publicId = userFound.profileImage.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(publicId);
  }

  const fullName = userFound.fullName || "user";
  const sanitizedTitle = fullName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[?&=]/g, "");
  

  const imgUrl = await cloudinaryUpload(profileImage.path, sanitizedTitle, "user-profile");
  if (imgUrl === "file upload failed") {
    throw new Error('File upload failed');
  }

  const updatedUser = await User.findByIdAndUpdate(id, { profileImage: imgUrl.url }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const deleteAvatarProfile = async (id) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');
  if (!userFound.profileImage) throw new Error('No profile image to delete');

  try {
    // Extract public ID from URL 
    const imageUrl = userFound.profileImage;
    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
    
    // Delete from Cloudinary
    const cloudinaryResult = await cloudinary.uploader.destroy(publicId);
    console.log('Cloudinary deletion result:', cloudinaryResult);
    
    // Verify deletion was successful
    if (cloudinaryResult.result !== 'ok') {
      throw new Error(`Cloudinary deletion failed: ${cloudinaryResult.result}`);
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { profileImage: '' },
      { new: true }
    ).select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

    return updatedUser;
  } catch (error) {
    console.error('Error in deleteAvatarProfile:', error);
    throw error; 
  }
};


export const createMultipleAvatar = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.multiProfileImage || files.multiProfileImage.length === 0) {
    throw new Error('Profile images are required');
  }

  const imageUrls = await Promise.all(files.multiProfileImage.map(async (image, index) => {
    const sanitizedTitle = `${userFound.fullName.toLowerCase().replace(/\s+/g, "-").replace(/[?&=]/g, "")}-${index}`;
    const imgUrl = await cloudinaryUpload(image.path, sanitizedTitle, "user-profile");
    if (imgUrl === "file upload failed") {
      throw new Error('File upload failed');
    }
    return imgUrl.url;
  }));

  const updatedUser = await User.findByIdAndUpdate(id, { multiProfileImage: imageUrls }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const updateMultipleAvatar = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.multiProfileImage || files.multiProfileImage.length === 0) {
    throw new Error('Profile images are required');
  }

  const imageUrls = await Promise.all(files.multiProfileImage.map(async (image, index) => {
    const sanitizedTitle = `${userFound.fullName.toLowerCase().replace(/\s+/g, "-").replace(/[?&=]/g, "")}-${index}`;
    const imgUrl = await cloudinaryUpload(image.path, sanitizedTitle, "user-profile");
    if (imgUrl === "file upload failed") {
      throw new Error('File upload failed');
    }
    return imgUrl.url;
  }));

  const updatedUser = await User.findByIdAndUpdate(id, { multiProfileImage: imageUrls }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const deleteMultipleAvatar = async (id) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!userFound.multiProfileImage || userFound.multiProfileImage.length === 0) {
    throw new Error('No profile images to delete');
  }

  const publicIds = userFound.multiProfileImage.map((image) => image.split('/').pop().split('.')[0]);
  await Promise.all(publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)));

  const updatedUser = await User.findByIdAndUpdate(id, { multiProfileImage: [] }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};  


// Upload user PDF
export const createUserPDF = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.userPDF || files.userPDF.length === 0) {
    throw new Error('PDF file is required');
  }

  const userPDF = files.userPDF[0];
  const sanitizedTitle = userFound.fullName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[?&=]/g, "");

  const pdfUrl = await cloudinaryUpload(userPDF.path, sanitizedTitle, "user-pdf");
  if (pdfUrl === "file upload failed") {
    throw new Error('File upload failed');
  }

  const updatedUser = await User.findByIdAndUpdate(id, { pdfFile: pdfUrl.url }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const updateUserPDF = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.userPDF || files.userPDF.length === 0) {
    throw new Error('PDF file is required');
  }

  const userPDF = files.userPDF[0];
  const sanitizedTitle = userFound.fullName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[?&=]/g, "");

  const pdfUrl = await cloudinaryUpload(userPDF.path, sanitizedTitle, "user-pdf");
  if (pdfUrl === "file upload failed") {
    throw new Error('File upload failed');
  }

  const updatedUser = await User.findByIdAndUpdate(id, { pdfFile: pdfUrl.url }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const deleteUserPDF = async (id) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!userFound.pdfFile) {
    throw new Error('No PDF file to delete'); 
  }

  const publicId = userFound.pdfFile.split('/').pop().split('.')[0];
  await cloudinary.uploader.destroy(publicId);

  const updatedUser = await User.findByIdAndUpdate(id, { pdfFile: null }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};

