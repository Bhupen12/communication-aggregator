import { createRabbitMQChannel, QUEUES } from "@repo/shared";
import { connectToMongoDB } from "./service/db";
import { handleTaskMessage } from "./service/messageHandler";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

const startWorker = async () => {
  const channel = await createRabbitMQChannel(RABBITMQ_URL);
  if (!channel) return;

  console.log("Connected to RabbitMQ");

  await connectToMongoDB();
  console.log("Connected to MongoDB");

  await channel.assertQueue(QUEUES.LOGS, { durable: true });
  await channel.assertQueue(QUEUES.MESSAGE, { durable: true });

  channel.prefetch(1);
  console.log("Worker waiting for messages...");

  channel.consume(QUEUES.MESSAGE, async (msg) => {
    if (!msg) return;
    handleTaskMessage(channel, msg);
  });
};

startWorker();
