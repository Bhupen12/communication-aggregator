const amqp = require('amqplib');
const mongoose = require('mongoose');

const RABBITMQ_URL = 'amqp://user:password@localhost:5672';
const QUEUE_NAME = 'message_queue';
const MONGO_URL = 'mongodb://localhost:27017/logs_db';

const logSchema = new mongoose.Schema({
  taskId: String,
  type: String,
  to: String,
  status: String,
  retryCount: Number,
  timestamp: { type: Date, default: Date.now }
});

const LogModel = mongoose.model('DeliveryLog', logSchema);

async function connectToMongoDB() {
  try { 
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    setTimeout(connectToMongoDB, 5000); // Retry after 5 seconds
  }
}

async function simulateDelivery(type, to) {
  return new Promise((resolve, reject) => {
    const processingTime = Math.random() * 2000 + 1000;
    console.log(`Sending ${type} to ${to}...`);
    setTimeout(() => {
      if(Math.random() < 0.1){
        reject(new Error('Delivery failed'));
      } else {
        console.log(`Delivered ${type} to ${to}`);
        resolve()
      }
    }, processingTime);
  })
}

async function processMessage(channel, msg) {
  const content = JSON.parse(msg.content.toString());
  const { id, type, to } = content;

  try {
    // Step A: Try to send
    await simulateDelivery(type, to);

    // Step B: Log success to DB
    await LogModel.create({
      taskId: id,
      type,
      to,
      status: 'SENT',
      retryCount: 0
    });
    console.log(`Message Send: ${id}`);

    // Step C: Send to elastic mq
    sendLog(channel, 'DeliveryService', 'SENT', id, { to, type });

    // Step D: Send ACK
    channel.ack(msg);
  } catch (error) {
    console.error(`Delivery Failed for ${id}: ${error.message}`);
    channel.nack(msg, false, true);
  }
}

function sendLog(channel, service, status, taskId, extra={}){
  if(channel){
    const logData = {
      service,
      status,
      taskId,
      ...extra,
      timestamp: new Date()
    }
    channel.sendToQueue('system_logs', Buffer.from(JSON.stringify(logData)));
  }
}

async function startWorker() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    channel.prefetch(1);

    console.log("Delivery Service waiting for messages...")

    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        processMessage(channel, msg);
      }
    });
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    setTimeout(startWorker, 5000);
  }
}

connectToMongoDB();
startWorker();