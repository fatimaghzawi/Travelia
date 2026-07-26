import mongoose, { Schema, Document, Model } from "mongoose";

export type ActivityCategory =
  | "adventure"
  | "food"
  | "culture"
  | "nature"
  | "shopping"
  | "entertainment"
  | "sports"
  | "relaxation"
  | "other";

export interface IActivity extends Document {
  destinationId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  /** Duration in minutes */
  duration: number;
  price: number;
  location?: string;
  image?: string | null;
  category: ActivityCategory;
  openingHours?: string | null;
  /** Max individual bookings (1 person = 1 seat). */
  capacity: number;
  /** Seats taken by pending/confirmed activity bookings. */
  bookedCount: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: "Destination",
      required: [true, "Destination is required"],
    },
    title: {
      type: String,
      required: [true, "Activity title is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 1000,
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
      default: 0,
    },
    location: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      enum: [
        "adventure",
        "food",
        "culture",
        "nature",
        "shopping",
        "entertainment",
        "sports",
        "relaxation",
        "other",
      ],
      default: "other",
    },
    openingHours: {
      type: String,
      default: null,
    },
    capacity: {
      type: Number,
      required: [true, "Activity capacity is required"],
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ActivitySchema.index({ destinationId: 1, isAvailable: 1 });
ActivitySchema.index({ title: "text", description: "text" });
ActivitySchema.index({ category: 1 });
ActivitySchema.index({ price: 1 });

ActivitySchema.pre("validate", function () {
  if (this.bookedCount > this.capacity) {
    this.invalidate("bookedCount", "Booked count cannot exceed capacity");
  }
});

ActivitySchema.virtual("remainingSlots").get(function (this: IActivity) {
  return Math.max(0, this.capacity - this.bookedCount);
});

ActivitySchema.virtual("isFullyBooked").get(function (this: IActivity) {
  return this.bookedCount >= this.capacity;
});

ActivitySchema.set("toJSON", { virtuals: true });
ActivitySchema.set("toObject", { virtuals: true });

const Activity: Model<IActivity> =
  mongoose.models.Activity || mongoose.model<IActivity>("Activity", ActivitySchema);

export default Activity;
