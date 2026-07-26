import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "booking"
  | "trip"
  | "reminder"
  | "promotion"
  | "announcement"
  | "verification";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string | null;
  relatedId?: mongoose.Types.ObjectId | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: [
        "booking",
        "trip",
        "reminder",
        "promotion",
        "announcement",
        "verification",
      ],
      required: [true, "Notification type is required"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: null,
      trim: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
