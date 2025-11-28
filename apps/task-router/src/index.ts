import express from "express";
import amqp from "amqplib";

const app = express();
app.use(express.json());

const PORT = 3001;
const RABBITMQ_URL = "amqp://user:password@localhost:5672";
const QUEUE_NAME = "message_queue";

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

  await channel.assertQueue(QUEUE_NAME, { durable: true });
  console.log("Server ready...");

  app.post("/api/send", async (req, res) => {
    const { type, message, to } = req.body;

    if (!type || !message || !to) {
      return res.status(400).json({ error: "Missing fields" });
    }

    if (!channel) {
      return res.status(500).json({ error: "RabbitMQ not connected" });
    }

    channel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify({ type, message, to }))
    );

    console.log("Message sent → RabbitMQ");

    return res.json({ message: "Sent" });
  });

  app.listen(PORT, () => console.log(`API running on ${PORT}`));
};

startServer();
