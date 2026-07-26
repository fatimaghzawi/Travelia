import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  destinationId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: "Destination",
      required: [true, "Destination is required"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

FavoriteSchema.index({ userId: 1, destinationId: 1 }, { unique: true });
FavoriteSchema.index({ userId: 1, createdAt: -1 });
FavoriteSchema.index({ destinationId: 1 });

const Favorite: Model<IFavorite> =
  mongoose.models.Favorite || mongoose.model<IFavorite>("Favorite", FavoriteSchema);

export default Favorite;
