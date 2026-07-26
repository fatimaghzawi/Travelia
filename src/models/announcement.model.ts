import mongoose, { Schema, Document, Model } from "mongoose";

export type AnnouncementAudience = "all" | "TRAVELER" | "ADMIN";

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  audience: AnnouncementAudience;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  sentCount: number;
  /** When notifications were last dispatched for a publish. */
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: 1000,
    },
    audience: {
      type: String,
      enum: ["all", "TRAVELER", "ADMIN"],
      default: "all",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    sentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AnnouncementSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ isActive: 1, audience: 1, createdAt: -1 });
AnnouncementSchema.index({ isActive: 1, audience: 1, createdAt: -1 });

const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);

export default Announcement;
