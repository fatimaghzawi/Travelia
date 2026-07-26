import type mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Expense, Trip } from "@/models";
import type { ExpenseCategory } from "@/models/expense.model";
import type { UpdateExpenseInput } from "@/validators/expense.validator";

async function requireEditableTrip(
  tripId: mongoose.Types.ObjectId | string,
  userId: string
) {
  const trip = await Trip.findOne({ _id: tripId, userId }).select("status");
  if (!trip) throw new AppError("Trip not found", 404, "NOT_FOUND");
  if (trip.status === "cancelled") {
    throw new AppError("Cannot edit a cancelled trip", 400, "CANCELLED");
  }
  return trip;
}

export async function listExpensesForTrip(tripId: string, userId: string) {
  await connectDB();
  const trip = await Trip.findOne({ _id: tripId, userId }).select("_id");
  if (!trip) throw new AppError("Trip not found", 404, "NOT_FOUND");

  return Expense.find({ tripId, userId }).sort("-date").lean();
}

export type CreateExpenseForTripInput = {
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  date?: string | Date;
  notes?: string | null;
};

export async function createExpenseForTrip(
  tripId: string,
  userId: string,
  input: CreateExpenseForTripInput
) {
  await connectDB();
  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) throw new AppError("Trip not found", 404, "NOT_FOUND");
  if (trip.status === "cancelled") {
    throw new AppError(
      "Cannot add expenses to a cancelled trip",
      400,
      "CANCELLED"
    );
  }

  return Expense.create({
    title: input.title,
    category: input.category,
    amount: Number(input.amount) || 0,
    currency: (input.currency || "USD").toUpperCase(),
    date: input.date ? new Date(input.date) : new Date(),
    notes: input.notes ?? null,
    tripId,
    userId,
  });
}

export async function updateExpense(
  expenseId: string,
  userId: string,
  input: UpdateExpenseInput
) {
  await connectDB();
  const expense = await Expense.findOne({ _id: expenseId, userId });
  if (!expense) throw new AppError("Expense not found", 404, "NOT_FOUND");

  await requireEditableTrip(expense.tripId, userId);

  Object.assign(expense, input);
  await expense.save();
  return expense;
}

export async function deleteExpense(expenseId: string, userId: string) {
  await connectDB();
  const expense = await Expense.findOne({ _id: expenseId, userId });
  if (!expense) throw new AppError("Expense not found", 404, "NOT_FOUND");

  await requireEditableTrip(expense.tripId, userId);

  await expense.deleteOne();
}
