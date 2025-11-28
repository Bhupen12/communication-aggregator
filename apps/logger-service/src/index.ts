import { Client } from "@elastic/elasticsearch";
import amqp, { Message } from "amqplib";
import { createRabbitMQChannel, QUEUES } from "@repo/shared";

const ELASTIC_NODE = "http://localhost:9200";

const esClient = new Client({ node: ELASTIC_NODE });

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
  const channel = await createRabbitMQChannel();
  if (!channel) return;

  await channel.assertQueue(QUEUES.LOGS, { durable: true });
  console.log("Logger ready...");

  channel.consume(QUEUES.LOGS, async (msg) => {
    const result = await saveLogToElasticsearch(msg);

    if (msg) {
      result.success ? channel.ack(msg) : channel.nack(msg);
    }
  });
};

startLogger();
