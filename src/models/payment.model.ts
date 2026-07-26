import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentMethod = "card" | "paypal" | "bank_transfer" | "cash";
export type PaymentRecordStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  /** Primary booking (first in a journey, or the only booking). */
  bookingId: mongoose.Types.ObjectId;
  /** All bookings covered by this payment (journey checkout). */
  bookingIds: mongoose.Types.ObjectId[];
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentRecordStatus;
  transactionId?: string;
  provider?: string | null;
  paidAt?: Date | null;
  failureReason?: string | null;
  refundAmount?: number;
  refundDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"],
    },
    bookingIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Booking" }],
      default: [],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
      maxlength: 3,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "paypal", "bank_transfer", "cash"],
      required: [true, "Payment method is required"],
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "refunded"],
      default: "pending",
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    provider: {
      type: String,
      default: null,
      trim: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
      maxlength: 500,
      trim: true,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PaymentSchema.pre("validate", function () {
  if (
    this.refundAmount != null &&
    this.amount != null &&
    this.refundAmount > this.amount
  ) {
    this.invalidate("refundAmount", "Refund amount cannot exceed payment amount");
  }
});

PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ status: 1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
