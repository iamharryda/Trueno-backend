import mongoose, { Schema } from "mongoose";

const chatRoomSchema = new Schema(
  {
    ride: { type: Schema.Types.ObjectId, ref: "Ride" }, 
    name: {
      type: String,  
    },
    isGroup: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true
    },
    avatar: {
      type: String, 
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: "Message"
      }
    ]
  },
  {
    timestamps: true
  }
);

const ChatRoom = mongoose.models.ChatRoom || mongoose.model("ChatRoom", chatRoomSchema);
export default ChatRoom;