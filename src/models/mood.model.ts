import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMood extends Document {
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MoodSchema = new Schema<IMood>(
  {
    name: {
      type: String,
      required: [true, "Mood name is required"],
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: [true, "Mood slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    icon: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

MoodSchema.index({ name: "text", description: "text" });

const Mood: Model<IMood> = mongoose.models.Mood || mongoose.model<IMood>("Mood", MoodSchema);

export default Mood;
