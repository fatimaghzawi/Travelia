import mongoose, { Schema, Document, Model } from "mongoose";

export type ExpenseCategory =
  | "hotel"
  | "food"
  | "transport"
  | "shopping"
  | "activities"
  | "flight"
  | "other";

export interface IExpense extends Document {
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  category: ExpenseCategory;
  title: string;
  amount: number;
  currency: string;
  date: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
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
    category: {
      type: String,
      enum: ["hotel", "food", "transport", "shopping", "activities", "flight", "other"],
      required: [true, "Category is required"],
    },
    title: {
      type: String,
      required: [true, "Expense title is required"],
      trim: true,
      maxlength: 100,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
      maxlength: 3,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
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

ExpenseSchema.index({ tripId: 1, category: 1 });
ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ date: -1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
