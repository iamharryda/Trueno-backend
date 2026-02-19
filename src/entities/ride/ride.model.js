import mongoose, { Schema } from 'mongoose';


const geoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  { _id: false }
);


const locationSchema = new Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    location: {
      type: geoPointSchema,
      required: true
    },
    radius: { type: Number, default: 200 } 
  },
  { _id: false }
);


const voteSchema = new Schema(
  {
    targetUser: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    votedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  { _id: false }
);


const rideSchema = new Schema(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startLocation: {
      type: locationSchema,
      required: true
    },
    endLocation: {
      type: locationSchema,
      required: true
    },
    note: {
      type: locationSchema
    },
    departureTime: {
      type: Date,
      required: true
    },
    seatCount: {
      type: Number,
      required: true,
      min: 1
    },
    bookedSeats: {
      type: Number,
      default: 0
    },
    filters: {
      departureFlexMinutes: { type: Number, default: 15 },
      arrivalFlexKm: { type: Number, default: 0.2 },
      departureFlexKm: { type: Number, default: 0.2 }
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },
    deletedByCreator: {
      type: Boolean,
      default: false
    },
    newCreator: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    kickedVotes: [voteSchema],
    chatRoom: {
      type: Schema.Types.ObjectId,
      ref: 'ChatRoom'
    },
    ratings: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Rating'
      }
    ],
    price: {
      type: Number,
      min: 0
    },

    // Optional: for future direction-based filtering
    bearing: {
      type: Number,
      min: 0,
      max: 360
    }
  },
  {
    timestamps: true
  }
);


// Whether vote count >= 50% of passengers
rideSchema.virtual('isKickEligible').get(function () {
  if (!this.kickedVotes.length || !this.bookedSeats) return false;
  const vote = this.kickedVotes[0];
  return vote.votedBy.length >= Math.ceil(this.bookedSeats * 0.5);
});

// Whether ride is expired and not marked completed
rideSchema.virtual('isExpired').get(function () {
  return this.departureTime < new Date() && this.status !== 'completed';
});


rideSchema.index({ departureTime: 1 });
rideSchema.index({ 'startLocation.location': '2dsphere' });
rideSchema.index({ 'endLocation.location': '2dsphere' });


const Ride = mongoose.models.Ride || mongoose.model('Ride', rideSchema);
export default Ride;
