import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
// import { unlink } from "fs/promises";
import { cloudinaryApiKey, cloudinaryCloudName, cloudinarySecret } from "../core/config/config.js";

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinarySecret,
});

export const cloudinaryUpload = async (filePath, public_id, folder) => {
  try {
    const extension = filePath.split(".").pop().toLowerCase();
    const isDocument = ["pdf", "docx", "doc", "xlsx", "xls", "ppt", "pptx"].includes(extension);

    const uploadImage = await cloudinary.uploader.upload(filePath, {
      resource_type: isDocument ? "raw" : "auto", 
      public_id,
      folder,
    });

    fs.unlinkSync(filePath);
    return uploadImage;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    fs.unlinkSync(filePath);
    return "file upload failed";
  }
};

export default cloudinary
