import mongoose, { Schema, Document, Model } from "mongoose";
import {
  ROLES,
  AUTH_PROVIDERS,
  type Role,
  type AuthProvider,
} from "@/lib/constants/roles";

export type UserRole = Role;
export type UserStatus = "active" | "inactive" | "blocked";

/**
 * Passport verification by admin (one-time travel document check).
 * Separate from emailVerified (auth email confirmation).
 */
export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export interface IUserPassport {
  fullName: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: Date;
  passportImage: string;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  /** Hashed password — required for credentials; omitted for OAuth-only users. */
  password?: string;
  phone?: string;
  /** Profile image URL (OAuth or upload). */
  image?: string | null;
  country?: string;
  bio?: string;
  passport?: IUserPassport | null;
  role: UserRole;
  emailVerified: boolean;
  provider: AuthProvider | string;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt?: Date | null;
  verifiedBy?: mongoose.Types.ObjectId | null;
  verificationNote?: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false,
      minlength: 8,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 300,
      trim: true,
    },
    passport: {
      type: new Schema(
        {
          fullName: {
            type: String,
            required: [true, "Passport full name is required"],
            trim: true,
            minlength: 2,
            maxlength: 100,
          },
          nationality: {
            type: String,
            required: [true, "Nationality is required"],
            trim: true,
            maxlength: 80,
          },
          passportNumber: {
            type: String,
            required: [true, "Passport number is required"],
            trim: true,
            uppercase: true,
            maxlength: 30,
          },
          passportExpiry: {
            type: Date,
            required: [true, "Passport expiry date is required"],
          },
          passportImage: {
            type: String,
            required: [true, "Passport image upload is required"],
            trim: true,
            maxlength: 2048,
          },
        },
        { _id: false }
      ),
      default: null,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.TRAVELER,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    provider: {
      type: String,
      default: AUTH_PROVIDERS.CREDENTIALS,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verificationNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ verificationStatus: 1, createdAt: -1 });
UserSchema.index({ firstName: "text", lastName: "text", email: "text" });

UserSchema.virtual("name").get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`.trim();
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

UserSchema.pre("validate", function () {
  if (
    this.provider === AUTH_PROVIDERS.CREDENTIALS &&
    !this.password &&
    this.isNew
  ) {
    this.invalidate("password", "Password is required for credentials accounts");
  }
});

UserSchema.pre("save", function () {
  const adminIsApproving =
    this.isModified("verificationStatus") &&
    this.verificationStatus === "verified";

  const passportChanged = this.modifiedPaths().some(
    (path) => path === "passport" || path.startsWith("passport.")
  );

  if (passportChanged && this.passport && !adminIsApproving) {
    this.verificationStatus = "pending";
    this.verifiedAt = null;
    this.verifiedBy = null;
  }

  // Keep boolean flag aligned with verificationStatus (source of truth)
  this.isVerified = this.verificationStatus === "verified";
  if (this.isVerified && !this.verifiedAt) {
    this.verifiedAt = new Date();
  }
  if (!this.isVerified) {
    // Leave verifiedAt as historical audit when rejected/pending after prior approval
  }
});

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
