import { Client } from "@elastic/elasticsearch";
import amqp, { Message } from "amqplib";

const RABBITMQ_URL = "amqp://user:password@localhost:5672";
const ELASTIC_NODE = "http://localhost:9200";
const QUEUE_NAME = "log_queue";

const esClient = new Client({ node: ELASTIC_NODE });

const connectToRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    return await connection.createChannel();
  } catch (err) {
    console.error("RabbitMQ connection failed, retrying...", err);
    setTimeout(connectToRabbitMQ, 5000);
  }
};

const saveLogToElasticsearch = async (msg: Message | null) => {
  if (!msg) return { success: false };

  try {
    const logData = JSON.parse(msg.content.toString());

    await esClient.index({
      index: "app-logs",
      document: {
        savedAt: new Date(),
        ...logData,
      },
    });

    console.log("Saved log to Elasticsearch");
    return { success: true };
  } catch (err) {
    console.error("Elasticsearch insert failed:", err);
    return { success: false };
  }
};

const startLogger = async () => {
  const channel = await connectToRabbitMQ();
  if (!channel) return;

  await channel.assertQueue(QUEUE_NAME, { durable: true });
  console.log("Logger ready...");

  channel.consume(QUEUE_NAME, async (msg) => {
    const result = await saveLogToElasticsearch(msg);

    if (msg) {
      result.success ? channel.ack(msg) : channel.nack(msg);
    }
  });
};

startLogger();
