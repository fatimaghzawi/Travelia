import mongoose, { Schema, Document, Model } from "mongoose";

export type TripStatus =
  | "planning"
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled";

/** Freeform stop on a traveler itinerary day. */
export interface IItineraryStop {
  _id?: mongoose.Types.ObjectId;
  title: string;
  notes?: string | null;
  /** Optional clock time e.g. "09:30" */
  startTime?: string | null;
  /** When to remind the traveler */
  reminderAt?: Date | null;
  reminderText?: string | null;
  completed: boolean;
  order: number;
}

export interface IJournalPlace {
  _id?: mongoose.Types.ObjectId;
  name: string;
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface IDayJournal {
  photos: string[];
  memory?: string | null;
  mood?: string | null;
  rating?: number | null;
  places: IJournalPlace[];
}

export interface ITripDay {
  _id?: mongoose.Types.ObjectId;
  date: Date;
  stops: IItineraryStop[];
  /** Day-level plan notes */
  notes?: string | null;
  /** Daily travel journal memories */
  journal?: IDayJournal | null;
}

export interface ITrip extends Document {
  userId: mongoose.Types.ObjectId;
  destinationId?: mongoose.Types.ObjectId | null;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  startDate: Date;
  endDate: Date;
  status: TripStatus;
  totalBudget: number;
  estimatedCost: number;
  days: ITripDay[];
  createdAt: Date;
  updatedAt: Date;
}

const ItineraryStopSchema = new Schema<IItineraryStop>(
  {
    title: {
      type: String,
      required: [true, "Stop title is required"],
      trim: true,
      maxlength: 120,
    },
    notes: {
      type: String,
      maxlength: 500,
      trim: true,
      default: null,
    },
    startTime: {
      type: String,
      trim: true,
      maxlength: 10,
      default: null,
    },
    reminderAt: {
      type: Date,
      default: null,
    },
    reminderText: {
      type: String,
      maxlength: 200,
      trim: true,
      default: null,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const JournalPlaceSchema = new Schema<IJournalPlace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    note: {
      type: String,
      maxlength: 300,
      trim: true,
      default: null,
    },
    lat: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },
    lng: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },
  },
  { _id: true }
);

const DayJournalSchema = new Schema<IDayJournal>(
  {
    photos: {
      type: [String],
      default: [],
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
      type: [JournalPlaceSchema],
      default: [],
    },
  },
  { _id: false }
);

const TripDaySchema = new Schema<ITripDay>(
  {
    date: {
      type: Date,
      required: true,
    },
    stops: {
      type: [ItineraryStopSchema],
      default: [],
    },
    notes: {
      type: String,
      maxlength: 500,
      trim: true,
      default: null,
    },
    journal: {
      type: DayJournalSchema,
      default: () => ({
        photos: [],
        memory: null,
        mood: null,
        rating: null,
        places: [],
      }),
    },
  },
  { _id: true }
);

const TripSchema = new Schema<ITrip>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: "Destination",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Trip title is required"],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    status: {
      type: String,
      enum: ["planning", "upcoming", "ongoing", "completed", "cancelled"],
      default: "planning",
    },
    totalBudget: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    estimatedCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    days: {
      type: [TripDaySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

TripSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate("endDate", "End date must be on or after start date");
  }
});

TripSchema.index({ userId: 1, status: 1 });
TripSchema.index({ startDate: 1 });
TripSchema.index({ title: "text" });
TripSchema.index({ destinationId: 1 });

// Recompile when schema evolves (dev hot-reload keeps stale models otherwise)
if (mongoose.models.Trip) {
  delete mongoose.models.Trip;
}

const Trip: Model<ITrip> = mongoose.model<ITrip>("Trip", TripSchema);

export default Trip;
