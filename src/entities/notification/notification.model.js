import mongoose, { Schema } from "mongoose";


const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["join", "kick", "finish", "rating", "message", "general"],
      required: true
    },
    ride: {
      type: Schema.Types.ObjectId,
      ref: "Ride"
    },
    message: {
      type: String,
      required: function () {
        return ["kick", "general"].includes(this.type);
      }
    },
    isRead: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      default: () => Date.now() + 7 * 24 * 60 * 60 * 1000
    }
  },
  {
    timestamps: true
  }
);


// Index for user notifications
notificationSchema.index({ user: 1 });

// TTL index for expiration
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export default Notification;