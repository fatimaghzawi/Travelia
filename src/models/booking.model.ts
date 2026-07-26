import mongoose, { Schema, Document, Model } from "mongoose";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface IBookingPassportSnapshot {
  fullName: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: Date;
  passportImage: string;
}

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  destinationId: mongoose.Types.ObjectId;
  /** Booked trip package (departure) — primary seat for destination trips. */
  tripPackageId?: mongoose.Types.ObjectId | null;
  activityId?: mongoose.Types.ObjectId | null;
  tripId?: mongoose.Types.ObjectId | null;
  bookingDate: Date;
  travelDate: Date;
  /** Always one seat for the logged-in user (no multi-guest bookings). */
  price: number;
  currency: string;
  /**
   * Booking lifecycle (payment/ops) — NOT admin identity approval.
   * Identity is approved once on the User (isVerified).
   * pending = awaiting payment / system processing
   * confirmed = booking accepted for the traveler (auto after rules + payment)
   */
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  /**
   * User confirmed: use my passport details from verified profile.
   * Only allowed when User.isVerified === true.
   */
  usePassportDetails: boolean;
  /** Snapshot of passport at booking time (set when usePassportDetails is true). */
  travelerPassport?: IBookingPassportSnapshot | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: "Destination",
      required: [true, "Destination is required"],
    },
    tripPackageId: {
      type: Schema.Types.ObjectId,
      ref: "TripPackage",
      default: null,
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      default: null,
    },
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    travelDate: {
      type: Date,
      required: [true, "Travel date is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
      maxlength: 3,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    usePassportDetails: {
      type: Boolean,
      default: false,
    },
    travelerPassport: {
      type: new Schema(
        {
          fullName: { type: String, required: true, trim: true, maxlength: 100 },
          nationality: { type: String, required: true, trim: true, maxlength: 80 },
          passportNumber: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 30,
          },
          passportExpiry: { type: Date, required: true },
          passportImage: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2048,
          },
        },
        { _id: false }
      ),
      default: null,
    },
    notes: {
      type: String,
      maxlength: 500,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ paymentStatus: 1 });
BookingSchema.index({ travelDate: 1 });
BookingSchema.index({ destinationId: 1, status: 1 });
BookingSchema.index({ activityId: 1, status: 1 });
BookingSchema.index({ tripId: 1 });
BookingSchema.index({ tripPackageId: 1, status: 1 });

// One person = one active seat per trip package
BookingSchema.index(
  { userId: 1, tripPackageId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      tripPackageId: { $type: "objectId" },
      status: { $in: ["pending", "confirmed"] },
    },
  }
);

// One person = one active seat per destination (destination-only booking, legacy)
BookingSchema.index(
  { userId: 1, destinationId: 1, travelDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      activityId: null,
      tripPackageId: null,
      status: { $in: ["pending", "confirmed"] },
    },
  }
);

// One person = one active seat per activity on a travel date
BookingSchema.index(
  { userId: 1, activityId: 1, travelDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      activityId: { $type: "objectId" },
      status: { $in: ["pending", "confirmed"] },
    },
  }
);

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
