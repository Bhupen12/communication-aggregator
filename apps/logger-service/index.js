const amqp = require('amqplib');
const { Client } = require('@elastic/elasticsearch');

const RABBITMQ_URL = 'amqp://user:password@localhost:5672';
const ELASTIC_NODE = 'http://localhost:9200';
const LOG_QUEUE = 'system_logs';

const esClient = new Client({ node: ELASTIC_NODE });

async function saveLogToElasticsearch(logData) {
  try {
    await esClient.index({
      index: 'app-logs',
      document: {
        ...logData,
        savedAt: new Date()
      }
    })
    console.log(`Log Saved: ${logData.service} - ${logData.status}`)
  } catch (error) {
    console.error('Error saving log to Elasticsearch:', error);
  }
}

async function startLogger(){
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(LOG_QUEUE, { durable: true });

    console.log("Logger Service waiting for messages...")

    channel.consume(LOG_QUEUE, async (msg) => {
      if (msg !== null) {
        const logEntry = JSON.parse(msg.content.toString());
        await saveLogToElasticsearch(logEntry);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    setTimeout(startLogger, 5000);
  }
}

startLogger();