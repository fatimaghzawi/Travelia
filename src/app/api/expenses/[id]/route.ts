import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { objectIdSchema } from "@/validators/common";
import { updateExpenseSchema } from "@/validators/expense.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import { deleteExpense, updateExpense } from "@/lib/expenses/queries";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const expenseId = objectIdSchema.parse(id);

  const raw = sanitizeInput(await request.json());
  const input = updateExpenseSchema.parse(raw);

  const expense = await updateExpense(expenseId, user.id, input);
  return ok(expense, "Expense updated");
});

export const DELETE = apiHandler(async (_request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const expenseId = objectIdSchema.parse(id);

  await deleteExpense(expenseId, user.id);
  return ok({ id: expenseId }, "Expense deleted");
});
