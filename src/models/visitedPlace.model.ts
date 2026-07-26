import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVisitedPlace extends Document {
  userId: mongoose.Types.ObjectId;
  destinationId: mongoose.Types.ObjectId;
  tripId?: mongoose.Types.ObjectId | null;
  visitDate: Date;
  rating?: number;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const VisitedPlaceSchema = new Schema<IVisitedPlace>(
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
    visitDate: {
      type: Date,
      required: [true, "Visit date is required"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    note: {
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

VisitedPlaceSchema.index({ userId: 1, visitDate: -1 });
VisitedPlaceSchema.index({ destinationId: 1 });
VisitedPlaceSchema.index({ tripId: 1 });

// One visit record per user + destination + trip (null trip = one unlinked visit)
VisitedPlaceSchema.index(
  { userId: 1, destinationId: 1, tripId: 1 },
  { unique: true }
);

const VisitedPlace: Model<IVisitedPlace> =
  mongoose.models.VisitedPlace ||
  mongoose.model<IVisitedPlace>("VisitedPlace", VisitedPlaceSchema);

export default VisitedPlace;
