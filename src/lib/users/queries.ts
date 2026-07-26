import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { User } from "@/models";
import { ROLES } from "@/lib/constants/roles";
import { hashPassword } from "@/lib/auth/passwords";
import type {
  AdminVerifyUserInput,
  CreateUserInput,
  UpdateUserInput,
} from "@/validators/user.validator";

export type ListUsersParams = {
  page: number;
  limit: number;
  sort?: string;
  search?: string;
  role?: string;
  status?: string;
  verificationStatus?: string;
};

export async function listUsers(params: ListUsersParams) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (params.role) filter.role = params.role;
  if (params.status) filter.status = params.status;
  if (params.verificationStatus) {
    filter.verificationStatus = params.verificationStatus;
  }
  if (params.search) {
    filter.$text = { $search: params.search };
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort(params.sort ?? "-createdAt")
      .skip((params.page - 1) * params.limit)
      .limit(params.limit),
    User.countDocuments(filter),
  ]);

  return { items, total };
}

export async function createUser(input: CreateUserInput) {
  await connectDB();
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new AppError(
      "An account with this email already exists",
      409,
      "EMAIL_TAKEN"
    );
  }

  const password = await hashPassword(input.password);
  return User.create({ ...input, password });
}

export async function getUser(id: string) {
  await connectDB();
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  return user;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actingAdminId: string
) {
  await connectDB();

  if (input.email) {
    const emailTaken = await User.findOne({
      email: input.email,
      _id: { $ne: id },
    });
    if (emailTaken) {
      throw new AppError("Email already in use", 409, "EMAIL_TAKEN");
    }
  }

  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  const demotingSelf =
    actingAdminId === id &&
    ((input.role && input.role !== ROLES.ADMIN) ||
      (input.status && input.status !== "active"));

  if (demotingSelf) {
    throw new AppError(
      "You cannot demote or block your own admin account",
      400,
      "SELF_DEMOTION"
    );
  }

  const removingAdmin =
    user.role === ROLES.ADMIN &&
    ((input.role && input.role !== ROLES.ADMIN) ||
      (input.status && input.status !== "active"));

  if (removingAdmin) {
    const activeAdmins = await User.countDocuments({
      role: ROLES.ADMIN,
      status: "active",
      _id: { $ne: user._id },
    });
    if (activeAdmins === 0) {
      throw new AppError(
        "Cannot remove the last active admin",
        400,
        "LAST_ADMIN"
      );
    }
  }

  Object.assign(user, input);
  await user.save();
  return user;
}

/** Soft delete — blocks the account rather than removing the row. */
export async function blockUser(id: string) {
  await connectDB();
  const user = await User.findByIdAndUpdate(
    id,
    { status: "blocked" },
    { returnDocument: "after" }
  );
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  return user;
}

export async function verifyUserPassport(
  id: string,
  input: AdminVerifyUserInput,
  actingAdminId: string
) {
  await connectDB();

  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  if (!user.passport && !input.force) {
    throw new AppError(
      "This user has not submitted passport details yet",
      400,
      "NO_PASSPORT"
    );
  }

  user.verificationStatus = input.action === "approve" ? "verified" : "rejected";
  user.isVerified = input.action === "approve";
  user.verificationNote = input.note ?? undefined;
  if (input.action === "approve") {
    user.verifiedAt = new Date();
    user.verifiedBy = new Types.ObjectId(actingAdminId);
  } else {
    user.verifiedBy = null;
  }
  await user.save();

  return user;
}
