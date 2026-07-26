import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDestination extends Document {
  title: string;
  slug: string;
  description: string;
  country: string;
  city: string;
  address?: string;
  thumbnail?: string | null;
  gallery: string[];
  latitude?: number;
  longitude?: number;
  estimatedBudget: number;
  recommendedDays: number;
  bestSeason?: string;
  ratingAverage: number;
  reviewCount: number;
  /** Max individual bookings (1 person = 1 seat). */
  capacity: number;
  /** Seats taken by pending/confirmed destination bookings. */
  bookedCount: number;
  /** If true, booking must confirm usePassportDetails. */
  requiresTravelDocuments: boolean;
  /** Simple visa guidance for travelers. */
  visaRequired: boolean;
  visaGuidance?: string | null;
  categoryId: mongoose.Types.ObjectId;
  moodIds: mongoose.Types.ObjectId[];
  isPublished: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DestinationSchema = new Schema<IDestination>(
  {
    title: {
      type: String,
      required: [true, "Destination title is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: [true, "Destination slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: 20,
      maxlength: 2000,
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    gallery: {
      type: [String],
      default: [],
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    estimatedBudget: {
      type: Number,
      required: [true, "Estimated budget is required"],
      min: 0,
    },
    recommendedDays: {
      type: Number,
      required: [true, "Recommended days is required"],
      min: 1,
    },
    bestSeason: {
      type: String,
      trim: true,
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    capacity: {
      type: Number,
      required: [true, "Destination capacity is required"],
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiresTravelDocuments: {
      type: Boolean,
      default: false,
    },
    visaRequired: {
      type: Boolean,
      default: false,
      index: true,
    },
    visaGuidance: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    moodIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Mood" }],
      default: [],
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

DestinationSchema.index({ title: "text", description: "text", country: "text", city: "text" });
DestinationSchema.index({ country: 1, city: 1 });
DestinationSchema.index({ categoryId: 1 });
DestinationSchema.index({ moodIds: 1 });
DestinationSchema.index({ ratingAverage: -1 });
DestinationSchema.index({ estimatedBudget: 1, recommendedDays: 1 });
DestinationSchema.index({ isPublished: 1, ratingAverage: -1, reviewCount: -1 });
DestinationSchema.index({ isPublished: 1, createdAt: -1 });
DestinationSchema.index({ isPublished: 1, bookedCount: -1 });
DestinationSchema.index({ isPublished: 1, estimatedBudget: 1 });
DestinationSchema.index({ isPublished: 1, recommendedDays: 1 });

DestinationSchema.pre("validate", function () {
  if (this.bookedCount > this.capacity) {
    this.invalidate("bookedCount", "Booked count cannot exceed capacity");
  }
});

DestinationSchema.virtual("remainingSlots").get(function (this: IDestination) {
  return Math.max(0, this.capacity - this.bookedCount);
});

DestinationSchema.virtual("isFullyBooked").get(function (this: IDestination) {
  return this.bookedCount >= this.capacity;
});

DestinationSchema.set("toJSON", { virtuals: true });
DestinationSchema.set("toObject", { virtuals: true });

const Destination: Model<IDestination> =
  mongoose.models.Destination ||
  mongoose.model<IDestination>("Destination", DestinationSchema);

export default Destination;
