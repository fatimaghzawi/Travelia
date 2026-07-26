import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { objectIdSchema } from "@/validators/common";
import {
  createExpenseSchema,
  expenseCategorySchema,
} from "@/validators/expense.validator";
import { sanitizeInput } from "@/lib/security/sanitize";
import {
  createExpenseForTrip,
  listExpensesForTrip,
} from "@/lib/expenses/queries";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const travelerCreateSchema = createExpenseSchema
  .omit({ userId: true, tripId: true })
  .extend({
    category: expenseCategorySchema.default("other"),
    currency: z.string().trim().length(3).default("USD"),
  });

export const GET = apiHandler(async (_request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  const expenses = await listExpensesForTrip(tripId, user.id);
  return ok(expenses, "Expenses");
});

export const POST = apiHandler(async (request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  const raw = sanitizeInput(await request.json());
  const input = travelerCreateSchema.parse(raw);

  const expense = await createExpenseForTrip(tripId, user.id, input);
  return ok(expense, "Expense created");
});
