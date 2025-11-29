import { createRabbitMQChannel, LogMessagePayload, QUEUES, TaskMessagePayload } from "@repo/shared";
import { type Message } from "amqplib";
import { connectToMongoDB, saveDeliveryLog } from "./config/db";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

const simulateDelivery = async (type: string, to: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 2000 + 1000;

    console.log(`Sending ${type} to ${to}...`);

    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error("Delivery failed"));
      } else {
        console.log(`Delivered ${type} to ${to}`);
        resolve();
      }
    }, delay);
  });
};

const processMessage = async (
  msg: Message | null
): Promise<{ success: boolean, data?: TaskMessagePayload}> => {
  if (!msg) return { success: false };

  const data: TaskMessagePayload = JSON.parse(msg.content.toString());
  console.log("Received message:", data);

  try {
    await simulateDelivery(data.type, data.to);
    return { success: true, data };
  } catch (error) {
    console.error("Processing failed:", error);
    return { success: false, data };
  }
};

const startWorker = async () => {
  const channel = await createRabbitMQChannel(RABBITMQ_URL);
  if (!channel) return;

  await connectToMongoDB();

  console.log("Connected to RabbitMQ");

  await channel.assertQueue(QUEUES.LOGS, { durable: true });
  await channel.assertQueue(QUEUES.MESSAGE, { durable: true });

  channel.prefetch(1);

  console.log("Worker waiting for messages...");

  channel.consume(QUEUES.MESSAGE, async (msg) => {
    const result = await processMessage(msg);

    if (msg) {
      if (result.success && result.data) {
        const {id, type, to}= result.data;

        const logPayload: LogMessagePayload = {
          service: "DeliveryService",
          taskId: id,
          to,
          type,
          status: 'SENT',
          timestamp: new Date(),
        }
        channel.sendToQueue(QUEUES.LOGS, Buffer.from(JSON.stringify(logPayload)));

        await saveDeliveryLog(id, type, to, 'SENT')

        channel.ack(msg);
      } else{
        channel.nack(msg);
      }
    }
  });
};

startWorker();
