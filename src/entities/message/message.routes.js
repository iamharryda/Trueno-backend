import express from "express";
import {
  createChatRoom,
  getRoomMessages,
  getUserChatRooms,
  markMessagesAsRead,
  sendMessage,
  leaveChatRoom,
  editMessage,
  deleteMessage,
  updateChatRoom,
  kickParticipant,
  getRideChatRoom
} from "./message.controller.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";

const router = express.Router();

router
  .route("/room")
  .post(verifyToken, multerUpload([{ name: "avatar", maxCount: 1 }]), createChatRoom);

router
  .route("/room/:roomId")
  .put(verifyToken, multerUpload([{ name: "avatar", maxCount: 1 }]), updateChatRoom);

router
  .route("/room/:roomId/kick")
  .put(verifyToken, adminMiddleware, kickParticipant);

router
  .route("/room/leave/:roomId")
  .delete(verifyToken, leaveChatRoom);

router
  .route("/rooms")
  .get(verifyToken, getUserChatRooms);

router
  .route("/ride/:rideId/chat")
  .get(verifyToken, getRideChatRoom);

router
  .route("/:roomId")
  .post(verifyToken, sendMessage)
  .get(verifyToken, getRoomMessages);
  
router
  .route("/read/:roomId")
  .put(verifyToken, markMessagesAsRead);

router
  .route("/:messageId")
  .put(verifyToken, editMessage)
  .delete(verifyToken, deleteMessage);

export default router;
