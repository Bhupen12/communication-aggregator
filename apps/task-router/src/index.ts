import express from "express";
import amqp from "amqplib";
import crypto from "crypto";

const app = express();
app.use(express.json());

const PORT = 3001;
const RABBITMQ_URL = "amqp://user:password@localhost:5672";
const MESSAGE_QUEUE = "message_queue";
const TASK_QUEUE = "log_queue"

const connectToRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    return await connection.createChannel();
  } catch (err) {
    console.error("RabbitMQ connection failed, retrying...", err);
    setTimeout(connectToRabbitMQ, 5000);
  }
};

const startServer = async () => {
  const channel = await connectToRabbitMQ();
  if (!channel) return;

  console.log("Connected to RabbitMQ");

  await channel.assertQueue(MESSAGE_QUEUE, { durable: true });
  await channel.assertQueue(TASK_QUEUE, { durable: true });
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

    channel.sendToQueue(
      MESSAGE_QUEUE,
      Buffer.from(JSON.stringify({ 
        id: taskId, 
        type, 
        message, 
        to,
        timestamp: new Date(),
     }))
    );

    channel.sendToQueue(
      TASK_QUEUE,
      Buffer.from(JSON.stringify({
        service: "TaskService",
        status: 'RECEIVED',
        to,
        taskId,
        type,
        timestamp: new Date(),
      }))
    );

    console.log("Message sent → RabbitMQ");

    return res.json({ message: "Queued", taskId });
  });

  app.listen(PORT, () => console.log(`API running on ${PORT}`));
};

startServer();
