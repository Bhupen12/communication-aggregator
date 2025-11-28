import * as amqp from "amqplib";

export const RABBITMQ_URL = "amqp://user:password@localhost:5672";

export const QUEUES = {
  MESSAGE: "message_queue",
  LOGS: "log_queue",
};

export const SERVICE_NAMES = {
  TASK_ROUTER: "TaskRouter",
  DELIVERY: "DeliveryService",
  LOGGER: "LoggerService",
};

export interface TaskMessagePayload {
  id: string;
  type: string;
  message?: string;
  to: string;
  timestamp: Date;
}

export interface LogMessagePayload {
  service: string;
  status: 'RECEIVED' | 'SENT' | 'FAILED';
  taskId: string;
  type: string;
  to: string;
  timestamp: Date;
}

export const createRabbitMQChannel = async (url: string = RABBITMQ_URL): Promise<amqp.Channel> => {
  try {
    const connection = await amqp.connect(url);
    console.log(`✅ Connected to RabbitMQ at ${url}`);
    return await connection.createChannel();
  } catch (err) {
    console.error("❌ RabbitMQ Connection failed. Retrying in 5s...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return createRabbitMQChannel(url); // Recursive call
  }
};