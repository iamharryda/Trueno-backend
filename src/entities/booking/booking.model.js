import mongoose, { Schema } from 'mongoose';

const bookingSchema = new Schema(
  {
    ride: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      required: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    seatBooked: {
      type: Number,
      default: 1,
      min: 1
    },
    baggageType: {
      type: String,
      enum: ['Large', 'Suitcase', 'None'],
      default: 'None'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'completed'],
      default: 'active'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    },
    kicked: {
      type: Boolean,
      default: false
    },
    cancelReason: {
      type: String,
      maxlength: 200
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);


// Pre-save: update ride bookedSeats safely
bookingSchema.pre('save', async function (next) {
  const Ride = mongoose.model('Ride');
  const ride = await Ride.findById(this.ride);

  if (!ride) throw new Error('Ride not found');

  // Only increase seats if new document or seatBooked changed
  if (this.isNew || this.isModified('seatBooked')) {
    const currentBookings = await mongoose
      .model('Booking')
      .aggregate([
        { $match: { ride: this.ride, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$seatBooked' } } }
      ]);

    const currentSeats = currentBookings[0]?.total || 0;
    if (currentSeats + this.seatBooked > ride.seatCount) {
      throw new Error('Not enough seats available');
    }

    ride.bookedSeats = currentSeats + this.seatBooked;
    await ride.save();
  }

  // Handle kick logic
  if (this.kicked && !this.leftAt) {
    this.status = 'cancelled';
    this.leftAt = new Date();
  }

  next();
});

// Post-update: adjust bookedSeats when booking is cancelled
bookingSchema.post('save', async function (doc) {
  if (doc.status === 'cancelled') {
    const Ride = mongoose.model('Ride');
    const ride = await Ride.findById(doc.ride);
    if (!ride) return;

    const activeSeats = await mongoose
      .model('Booking')
      .aggregate([
        { $match: { ride: ride._id, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$seatBooked' } } }
      ]);

    ride.bookedSeats = activeSeats[0]?.total || 0;
    await ride.save();
  }
});

const Booking =
  mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;
