import mongoose, { Document, Schema } from "mongoose";

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/logs_db';

interface IDeliveryLog extends Document {
  taskId: string;
  type: string;
  to: string;
  status: string;
  retryCount: number;
  timestamp: Date;
}

const LogSchema = new Schema<IDeliveryLog>({
  taskId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  to: { type: String, required: true },
  status: { type: String, required: true },
  retryCount: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

const DeliveryLogModel = mongoose.model<IDeliveryLog>("DeliveryLog", LogSchema);

export const connectToMongoDB = async (retries = 0, maxRetries = 10): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB");
  } catch (error) {
    if (retries >= maxRetries) {
      console.error("Max MongoDB connection retries reached. Exiting...");
      process.exit(1);
    }
    console.error("MongoDB connection failed. Retrying in 5s...", error);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectToMongoDB(retries + 1, maxRetries);
  }
};

export const saveDeliveryLog = async (
  taskId: string,
  type: string,
  to: string,
  status: string = "SENT"
): Promise<boolean> => {
  try {
    await DeliveryLogModel.create({
      taskId,
      type,
      to,
      status,
      retryCount: 0,
    });
    console.log(`Logged to MongoDB: ${taskId}`);
    return true;
  } catch (error: any) {
    if (error.code === 11000) {
     console.log("Duplicate log, ignoring:", taskId);
     return true;
   }
    console.error("Failed to save log to MongoDB", error);
    return false;
  }
};