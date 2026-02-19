import mongoose, { Schema } from "mongoose";


const ratingSchema = new Schema(
  {
    ride: {
      type: Schema.Types.ObjectId,
      ref: "Ride",
      required: true
    },
    rater: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    ratedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    dismissed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);


// Ensure rater and ratedUser are different
ratingSchema.pre("save", function (next) {
  if (this.rater.equals(this.ratedUser)) {
    throw new Error("Rater and rated user cannot be the same");
  }
  next();
});

// Unique index to prevent duplicate ratings
ratingSchema.index({ ride: 1, rater: 1, ratedUser: 1 }, { unique: true });


const Rating = mongoose.models.Rating || mongoose.model("Rating", ratingSchema);
export default Rating;