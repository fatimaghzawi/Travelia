import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReview extends Document {
  userId: mongoose.Types.ObjectId;
  destinationId: mongoose.Types.ObjectId;
  /** Completed trip that unlocked this review (optional for legacy rows). */
  tripId?: mongoose.Types.ObjectId | null;
  rating: number;
  comment?: string;
  images: string[];
  likes: number;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
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
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    images: {
      type: [String],
      default: [],
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One review per user per destination
ReviewSchema.index({ userId: 1, destinationId: 1 }, { unique: true });
ReviewSchema.index({ destinationId: 1, isApproved: 1, rating: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ tripId: 1 });

const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
