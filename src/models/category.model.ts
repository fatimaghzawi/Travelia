import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: [true, "Category slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    icon: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
