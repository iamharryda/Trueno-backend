import { multerUpload } from "../../core/middlewares/multer.js";
import { 
     getAllUsersController, getAllAdminsController, getAllSelleresController, getUserByIdController,updateUserController, deleteUserController, 
     createAvatarController,updateAvatarProfileController,deleteAvatarController,
     createMultipleAvatarController,updateMultipleAvatarController,deleteMultipleAvatarController,
     createUserPDFController,updateUserPDFController,deleteUserPDFController
    } from "./user.controller.js";
import { adminMiddleware,  verifyToken } from "../../core/middlewares/authMiddleware.js";
import express from "express";


const router = express.Router();


// Admin dashboard
router.get("/all-users", verifyToken, adminMiddleware , getAllUsersController);
router.get("/all-admins", verifyToken, adminMiddleware,  getAllAdminsController);
router.get("/all-sellers", verifyToken, adminMiddleware, getAllSelleresController);

// user
router.get("/:id", verifyToken, getUserByIdController);
router.put("/:id", verifyToken, updateUserController);
router.delete("/:id", verifyToken, adminMiddleware,  deleteUserController);

// avatar
router.post("/upload-avatar/:id", verifyToken, multerUpload([{ name: "profileImage", maxCount: 1 }]), createAvatarController);
router.put("/upload-avatar/:id", verifyToken, multerUpload([{ name: "profileImage", maxCount: 1 }]), updateAvatarProfileController);
router.delete("/upload-avatar/:id", verifyToken, deleteAvatarController);

// multiple avatar
router.post("/upload-multiple-avatar/:id", verifyToken, multerUpload([{ name: "multiProfileImage", maxCount: 5 },]), createMultipleAvatarController);
router.put("/upload-multiple-avatar/:id", verifyToken, multerUpload([{ name: "multiProfileImage", maxCount: 5 },]), updateMultipleAvatarController);
router.delete("/upload-multiple-avatar/:id", verifyToken,deleteMultipleAvatarController);

// file upload
router.post("/upload-file/:id", verifyToken, multerUpload([{ name: "userPDF", maxCount: 1 },]),createUserPDFController);
router.put("/upload-file/:id", verifyToken, multerUpload([{ name: "userPDF", maxCount: 1 },]),updateUserPDFController);
router.delete("/upload-file/:id", verifyToken, deleteUserPDFController);


export default router;



