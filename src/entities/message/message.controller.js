import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import { generateResponse } from "../../lib/responseFormate.js";
import { createChatRoomService, deleteMessageService, editMessageService, getRoomMessagesService, getUserChatRoomsService, kickParticipantService, leaveChatRoomService, markMessagesAsReadService, sendMessageService, updateChatRoomService, getRideChatRoomService } from "./message.service.js";


export const createChatRoom = async (req, res) => {
  try {
    const { participantIds, name, isGroup } = req.body;

    const avatarFile = req.files?.avatar?.[0];
    let avatar = null;

    if (avatarFile) {
      const result = await cloudinaryUpload(
        avatarFile.path,
        `chat_avatar_${Date.now()}`,
        "chat/avatars"
      );
      if (result?.secure_url) {
        avatar = result.secure_url;
      }
    }

    const room = await createChatRoomService(participantIds, name, isGroup, avatar);
    generateResponse(res, 201, true, "Chat room created", room);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to create chat room", error.message);
  }
};


export const updateChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;
    const avatarFile = req.files?.avatar?.[0];

    let avatar;

    if (avatarFile) {
      const result = await cloudinaryUpload(
        avatarFile.path,
        `chat_avatar_${Date.now()}`,
        "chat/avatars"
      );
      if (result?.secure_url) {
        avatar = result.secure_url;
      }
    }

    const room = await updateChatRoomService(roomId, {
      ...(name && { name }),
      ...(description && { description }),
      ...(avatar && { avatar })
    });

    generateResponse(res, 200, true, "Room updated successfully", room);
  } catch (err) {
    generateResponse(res, 400, false, "Failed to update room", err.message);
  }
};


export const kickParticipant = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body; 

    const updatedRoom = await kickParticipantService(roomId, userId);

    generateResponse(res, 200, true, "User removed from the room", updatedRoom);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to remove user from room", error.message);
  }
};


export const leaveChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    await leaveChatRoomService(roomId, userId);

    generateResponse(res, 200, true, "You left the chat room", null);
  } catch (err) {
    generateResponse(res, 400, false, "Failed to leave chat room", err.message);
  }
};


export const getUserChatRooms = async (req, res) => {
  try {
    const userId = req.user._id;
    const rooms = await getUserChatRoomsService(userId);
    generateResponse(res, 200, true, "Chat rooms fetched", rooms);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch chat rooms", error.message);
  }
};


export const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const senderId = req.user._id;

    const newMessage = await sendMessageService(roomId, senderId, message);
    generateResponse(res, 201, true, "Message sent", newMessage);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to send message", error.message);
  }
};


export const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const messages = await getRoomMessagesService(roomId, skip, limit);
    generateResponse(res, 200, true, "Messages fetched", messages);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch messages", error.message);
  }
};


export const markMessagesAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    await markMessagesAsReadService(roomId, userId);
    generateResponse(res, 200, true, "Messages marked as read", null);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to mark messages as read", error.message);
  }
};


export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    const updatedMessage = await editMessageService(messageId, message, userId);

    generateResponse(res, 200, true, "Message updated successfully", updatedMessage);
  } catch (err) {
    generateResponse(res, 400, false, "Failed to update message", err.message);
  }
};


export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    await deleteMessageService(messageId, userId);

    generateResponse(res, 200, true, "Message deleted successfully", null);
  } catch (err) {
    generateResponse(res, 400, false, "Failed to delete message", err.message);
  }
};


export const getRideChatRoom = async (req, res) => {
  try {
    const { rideId } = req.params;
    const chatRoom = await getRideChatRoomService(rideId);
    generateResponse(res, 200, true, "Ride chat room fetched", chatRoom);
  } catch (error) {
    generateResponse(res, 404, false, "Failed to fetch ride chat room", error.message);
  }
};
