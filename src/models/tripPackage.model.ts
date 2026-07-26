import mongoose, { Schema, Document, Model } from "mongoose";

export type TripPackageStatus = "open" | "closed" | "full";

/**
 * Sellable departure of a Destination (admin inventory).
 * Separate from traveler Trip itineraries.
 */
export interface ITripPackage extends Document {
  destinationId: mongoose.Types.ObjectId;
  title?: string | null;
  departureDate: Date;
  returnDate: Date;
  /** Max seats for this departure. */
  capacity: number;
  bookedCount: number;
  price: number;
  currency: string;
  guideIncluded: boolean;
  status: TripPackageStatus;
  isPublished: boolean;
  notes?: string | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  remainingSlots: number;
  isFullyBooked: boolean;
}

const TripPackageSchema = new Schema<ITripPackage>(
  {
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: "Destination",
      required: [true, "Destination is required"],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    departureDate: {
      type: Date,
      required: [true, "Departure date is required"],
    },
    returnDate: {
      type: Date,
      required: [true, "Return date is required"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
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
    guideIncluded: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["open", "closed", "full"],
      default: "open",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TripPackageSchema.virtual("remainingSlots").get(function (this: ITripPackage) {
  return Math.max(0, this.capacity - (this.bookedCount ?? 0));
});

TripPackageSchema.virtual("isFullyBooked").get(function (this: ITripPackage) {
  return (this.bookedCount ?? 0) >= this.capacity;
});

TripPackageSchema.pre("validate", function () {
  if (
    this.departureDate &&
    this.returnDate &&
    this.returnDate < this.departureDate
  ) {
    this.invalidate("returnDate", "Return date must be on or after departure");
  }
});

TripPackageSchema.pre("save", function () {
  if (this.status !== "closed") {
    this.status =
      (this.bookedCount ?? 0) >= this.capacity ? "full" : "open";
  }
});

TripPackageSchema.index({ destinationId: 1, departureDate: 1 });
TripPackageSchema.index({ isPublished: 1, status: 1, departureDate: 1 });

const TripPackage: Model<ITripPackage> =
  mongoose.models.TripPackage ||
  mongoose.model<ITripPackage>("TripPackage", TripPackageSchema);

export default TripPackage;
