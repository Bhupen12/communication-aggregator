import mongoose, { Document, Schema } from "mongoose";

const MONGO_URL = 'mongodb://localhost:27017/logs_db';

interface IDeliveryLog extends Document {
  taskId: string;
  type: string;
  to: string;
  status: string;
  retryCount: number;
  timestamp: Date;
}

const LogSchema = new Schema<IDeliveryLog>({
  taskId: { type: String, required: true },
  type: { type: String, required: true },
  to: { type: String, required: true },
  status: { type: String, required: true },
  retryCount: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

const DeliveryLogModel = mongoose.model<IDeliveryLog>("DeliveryLog", LogSchema);

export const connectToMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection failed. Retrying in 5s...", error);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectToMongoDB();
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
  } catch (error) {
    console.error("Failed to save log to MongoDB", error);
    return false;
  }
};