import express from "express";
import crypto from "crypto";
import { createRabbitMQChannel, LogMessagePayload, QUEUES, SERVICE_NAMES, TaskMessagePayload } from "@repo/shared";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";


const startServer = async () => {
  const channel = await createRabbitMQChannel(RABBITMQ_URL);
  if (!channel) return;

  console.log("Connected to RabbitMQ");

  await channel.assertQueue(QUEUES.MESSAGE, { durable: true });
  await channel.assertQueue(QUEUES.LOGS, { durable: true });
  console.log("Server ready...");

  app.post("/api/send", async (req, res) => {
    const { type, message, to } = req.body;

    if (!type || !message || !to) {
      return res.status(400).json({ error: "Missing fields" });
    }

    if (!channel) {
      return res.status(500).json({ error: "RabbitMQ not connected" });
    }

    const taskId = crypto.randomUUID();

    const msgPayload: TaskMessagePayload = {
      id: taskId,
      type,
      message,
      to,
      timestamp: new Date(),
    }

    channel.sendToQueue(
      QUEUES.MESSAGE,
      Buffer.from(JSON.stringify(msgPayload))
    );

    const logPayload: LogMessagePayload = {
      service: SERVICE_NAMES.TASK_ROUTER,
      status: 'RECEIVED',
      taskId,
      type,
      to,
      timestamp: new Date(),
    }

    channel.sendToQueue(
      QUEUES.LOGS,
      Buffer.from(JSON.stringify(logPayload))
    );

    console.log("Message sent → RabbitMQ");

    return res.json({ message: "Queued", taskId });
  });

  app.listen(PORT, () => console.log(`API running on ${PORT}`));
};

startServer();
