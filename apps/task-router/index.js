const express = require('express');
const amqp = require('amqplib');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = 3001;
const RABBITMQ_URL = 'amqp://user:password@localhost:5672';
const QUEUE_NAME = 'message_queue';

let channel;
async function connectToRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    setTimeout(connectToRabbitMQ, 5000); // Retry after 5 seconds
  }
}

function generateMessageHash(payload) {
  return crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');
}

const processedRequestHashes = new Set();

app.post('/api/send', async (req, res) => {
  const {type, message, to} = req.body;

  if(!type || !message || !to){
    return res.status(400).json({error: 'Missing required fields'});
  }

  const payloadHash = generateMessageHash(req.body);
  if(processedRequestHashes.has(payloadHash)){
    return res.status(409).json({error: 'Duplicate message Detected'});
  }

  processedRequestHashes.add(payloadHash);
  setTimeout(() => {
    processedRequestHashes.delete(payloadHash);
  }, 60000);

  const task = {
    id: crypto.randomUUID(),
    type,
    message,
    to,
    timestamp: new Date()
  }

  if(channel){
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(task)));
    console.log('Message sent to RabbitMQ:', task);
    return res.status(200).json({
      status: "Queued",
      taskId: task.id
    })
  } else {
    return res.status(503).json({error: 'Service Unavailable'});
  }

});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  await connectToRabbitMQ();
});