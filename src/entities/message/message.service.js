import { io } from "../../app.js";
import ChatRoom from "./chatRoom.model.js";
import Message from "./message.model.js";
import { createNotificationService } from "../notification/notification.service.js";
import Ride from "../ride/ride.model.js";

export const createChatRoomService = async (participantIds, name, isGroup, avatar, rideId = null) => {
  // For ride chat rooms, allow single participant (creator)
  if (!rideId && (!participantIds || participantIds.length < 2)) {
    throw new Error("At least 2 participants are required for non-ride chat rooms.");
  }

  const roomData = {
    name: isGroup ? name : null,
    isGroup,
    avatar: isGroup ? avatar : null,
    participants: participantIds
  };

  // Add ride reference if provided
  if (rideId) {
    roomData.ride = rideId;
  }

  const room = await ChatRoom.create(roomData);

  // Emit room created event
  io.emit("roomCreated", room);

  // Notify all participants (except the creator) that they were added to the ride
  if (isGroup && participantIds.length > 1 && rideId) {
    for (const userId of participantIds.slice(1)) {
      await createNotificationService({
        user: userId,
        type: "join",
        ride: rideId,
        message: "You have been added to a ride group."
      });
    }
  }

  return room;
};

export const updateChatRoomService = async (roomId, updates) => {
  const room = await ChatRoom.findByIdAndUpdate(roomId, updates, {
    new: true
  });

  if (!room) throw new Error("Room not found");
  io.to(`room-${roomId}`).emit("roomUpdated", room);
  return room;
};


export const kickParticipantService = async (roomId, userIdToKick) => {
  const room = await ChatRoom.findById(roomId);
  if (!room) throw new Error("Room not found");

  const index = room.participants.findIndex(
    id => id.toString() === userIdToKick.toString()
  );
  if (index === -1) throw new Error("User is not a participant of this room");

  room.participants.splice(index, 1);
  await room.save();

  // Create system message for kick
  await Message.create({
    chatRoom: roomId,
    sender: null,
    message: `A user was kicked from the room`,
    type: "system"
  });
  io.to(`room-${roomId}`).emit("userKicked", { roomId, userId: userIdToKick });

  // Notify the kicked user
  const chatRoom = await ChatRoom.findById(roomId);
  const ride = await Ride.findOne({ chatRoom: chatRoom._id });
  await createNotificationService({
    user: userIdToKick,
    type: "kick",
    ride: ride ? ride._id : undefined,
    message: "You have been kicked from the ride."
  });

  return room;
};

export const leaveChatRoomService = async (roomId, userId) => {
  const room = await ChatRoom.findById(roomId);
  if (!room) throw new Error("Room not found");

  const index = room.participants.findIndex(
    (id) => id.toString() === userId.toString()
  );
  if (index === -1) throw new Error("User is not in this room");

  room.participants.splice(index, 1);
  await room.save();

  // Create system message for leave
  await Message.create({
    chatRoom: roomId,
    sender: userId,
    message: `A user left the room`,
    type: "system"
  });
  io.to(`room-${roomId}`).emit("userLeft", { roomId, userId });
};

export const getRideChatRoomService = async (rideId) => {
  const chatRoom = await ChatRoom.findOne({ ride: rideId })
    .populate('participants', 'name email avatar')
    .populate('messages')
    .lean();
  
  if (!chatRoom) throw new Error('Chat room not found for this ride');
  
  return chatRoom;
};

export const getUserChatRoomsService = async (userId) => {
  const rooms = await ChatRoom.find({ participants: userId })
    .populate('participants', 'name email')
    .populate('ride', 'startLocation endLocation departureTime')
    .lean();
  return rooms;
};

export const sendMessageService = async (roomId, senderId, messageText, attachments = [], replyTo = null) => {
  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) throw new Error("Chat room not found");

  const message = await Message.create({
    chatRoom: roomId,
    sender: senderId,
    message: messageText,
    type: "text",
    attachments,
    replyTo,
    readBy: [senderId]
  });

  io.to(`room-${roomId}`).emit("newMessage", message);
  return message;
};

export const getRoomMessagesService = async (roomId, skip, limit) => {
  const messages = await Message.find({ chatRoom: roomId })
    .populate("sender", "name email")
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit));
  return messages.reverse();
};

export const markMessagesAsReadService = async (roomId, userId) => {
  await Message.updateMany(
    {
      chatRoom: roomId,
      readBy: { $ne: userId }
    },
    {
      $push: { readBy: userId }
    }
  );
  io.to(`room-${roomId}`).emit("messagesRead", { roomId, userId });
};

export const editMessageService = async (messageId, newText, userId) => {
  const message = await Message.findOneAndUpdate(
    { _id: messageId, sender: userId },
    { message: newText },
    { new: true }
  );
  if (!message) throw new Error("Message not found or not editable by user");
  io.to(`room-${message.chatRoom}`).emit("editMessage", message);
  return message;
};

export const deleteMessageService = async (messageId, userId) => {
  const message = await Message.findOneAndDelete({
    _id: messageId,
    sender: userId
  });
  if (!message) throw new Error("Message not found or not deletable by user");
  io.to(`room-${message.chatRoom}`).emit("messageDeleted", { messageId });
};
