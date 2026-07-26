import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITripJournalPlace {
  _id?: mongoose.Types.ObjectId;
  name: string;
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface ITripJournalEntry extends Document {
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** UTC calendar day key YYYY-MM-DD */
  dayKey: string;
  photos: string[];
  memory?: string | null;
  mood?: string | null;
  rating?: number | null;
  places: ITripJournalPlace[];
  createdAt: Date;
  updatedAt: Date;
}

const PlaceSchema = new Schema<ITripJournalPlace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    note: { type: String, maxlength: 300, trim: true, default: null },
    lat: { type: Number, min: -90, max: 90, default: null },
    lng: { type: Number, min: -180, max: 180, default: null },
  },
  { _id: true }
);

const TripJournalSchema = new Schema<ITripJournalEntry>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dayKey: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 12,
        message: "Max 12 photos",
      },
    },
    memory: {
      type: String,
      maxlength: 2000,
      trim: true,
      default: null,
    },
    mood: {
      type: String,
      default: null,
      validate: {
        validator: (value: string | null | undefined) =>
          value == null ||
          [
            "happy",
            "adventurous",
            "relaxed",
            "tired",
            "romantic",
            "amazed",
            "grateful",
          ].includes(value),
        message: "Invalid mood",
      },
    },
    rating: {
      type: Number,
      default: null,
      validate: {
        validator: (value: number | null | undefined) =>
          value == null || (value >= 1 && value <= 5),
        message: "Rating must be 1–5",
      },
    },
    places: {
      type: [PlaceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "trip_journals",
  }
);

TripJournalSchema.index({ tripId: 1, dayKey: 1 }, { unique: true });
TripJournalSchema.index({ userId: 1, tripId: 1 });

if (mongoose.models.TripJournal) {
  delete mongoose.models.TripJournal;
}

const TripJournal: Model<ITripJournalEntry> = mongoose.model<ITripJournalEntry>(
  "TripJournal",
  TripJournalSchema
);

export default TripJournal;
