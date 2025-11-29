import * as amqp from "amqplib";

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

export const createRabbitMQChannel = async (url: string, maxRetries: number = 10, retryCount: number = 0): Promise<amqp.Channel> => {
  try {
    const connection = await amqp.connect(url);
    console.log(`✅ Connected to RabbitMQ at ${url}`);
    return await connection.createChannel();
  } catch (err) {
    if(retryCount >= maxRetries){
      console.error(`RabbitMQ Connection failed after ${maxRetries} attempts`);
      throw new Error("Max RabbitMQ connection retries exceeded");
    }

    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    console.error(`RabbitMQ Connection failed. Retrying in ${delay}ms... (${retryCount + 1}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return createRabbitMQChannel(url, maxRetries, retryCount + 1); // Recursive call
  }
};