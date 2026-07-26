import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChecklistItem {
  text: string;
  completed: boolean;
}

export interface IChecklist extends Document {
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  items: IChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    text: {
      type: String,
      required: [true, "Item text is required"],
      trim: true,
      maxlength: 200,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const ChecklistSchema = new Schema<IChecklist>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: [true, "Trip is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    title: {
      type: String,
      required: [true, "Checklist title is required"],
      trim: true,
      maxlength: 100,
    },
    items: {
      type: [ChecklistItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ChecklistSchema.index({ userId: 1, tripId: 1 });
ChecklistSchema.index({ tripId: 1 });
ChecklistSchema.index({ title: "text" });

const Checklist: Model<IChecklist> =
  mongoose.models.Checklist || mongoose.model<IChecklist>("Checklist", ChecklistSchema);

export default Checklist;
