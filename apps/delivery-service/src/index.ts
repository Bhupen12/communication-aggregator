import amqp, { Message } from "amqplib";

const RABBITMQ_URL = "amqp://user:password@localhost:5672";
const QUEUE_NAME = "message_queue";

type TaskMessage = {
  id: string;
  type: string;
  to: string;
};

const connectToRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    return await connection.createChannel();
  } catch (err) {
    console.error("RabbitMQ connection failed, retrying...", err);
    setTimeout(connectToRabbitMQ, 5000);
  }
};

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
): Promise<{ success: boolean }> => {
  if (!msg) return { success: false };

  const data: TaskMessage = JSON.parse(msg.content.toString());
  console.log("Received message:", data);

  try {
    await simulateDelivery(data.type, data.to);
    return { success: true };
  } catch (error) {
    console.error("Processing failed:", error);
    return { success: false };
  }
};

const startWorker = async () => {
  const channel = await connectToRabbitMQ();
  if (!channel) return;

  console.log("Connected to RabbitMQ");

  await channel.assertQueue(QUEUE_NAME, { durable: true });
  channel.prefetch(1);

  console.log("Worker waiting for messages...");

  channel.consume(QUEUE_NAME, async (msg) => {
    const result = await processMessage(msg);

    if (msg) {
      result.success ? channel.ack(msg) : channel.nack(msg);
    }
  });
};

startWorker();
