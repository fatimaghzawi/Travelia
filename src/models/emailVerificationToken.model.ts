import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IEmailVerificationToken extends Document {
  userId: Types.ObjectId;
  hashedToken: string;
  expiresAt: Date;
  createdAt: Date;
}

const EmailVerificationTokenSchema = new Schema<IEmailVerificationToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hashedToken: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

/** TTL: MongoDB deletes the document when expiresAt is in the past. */
EmailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerificationToken: Model<IEmailVerificationToken> =
  mongoose.models.EmailVerificationToken ||
  mongoose.model<IEmailVerificationToken>(
    "EmailVerificationToken",
    EmailVerificationTokenSchema
  );

export default EmailVerificationToken;
