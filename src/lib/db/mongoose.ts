import mongoose from "mongoose";
import { logger } from "@/lib/logger";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  logged: boolean;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
  logged: false,
};

global.mongooseCache = cached;

/**
 * Cached Mongoose connection for Next.js hot reload / serverless.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      bufferCommands: false,
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
      serverSelectionTimeoutMS: 8_000,
      socketTimeoutMS: 45_000,
      maxIdleTimeMS: 60_000,
    });
  }

  try {
    cached.conn = await cached.promise;
    if (!cached.logged) {
      cached.logged = true;
      logger.info(`MongoDB connected (${mongoose.connection.name})`);
    }
  } catch (error) {
    cached.promise = null;
    logger.error("MongoDB connection failed", { error });
    throw error;
  }

  return cached.conn;
}
