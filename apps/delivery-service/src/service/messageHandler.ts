import { LogMessagePayload, QUEUES, SERVICE_NAMES } from "@repo/shared";
import { Channel, Message } from "amqplib";
import { saveDeliveryLog } from "./db";
import { parseTaskMessage, simulateDelivery } from "./utils";

const MAX_RETRIES = 3;

export const handleTaskMessage = async (channel: Channel, msg: Message) => {
  const headers = msg.properties?.headers || {};
  const retryCount = Number(headers.retryCount ?? 0) || 0;

  const data = parseTaskMessage(msg);
  if (!data) {
    console.error("Dropped invalid message");
    channel.ack(msg);
    return;
  }

  console.log("Received message:", data);

  try {
    await simulateDelivery(data.type, data.to);

    const logPayload: LogMessagePayload = {
      service: SERVICE_NAMES.DELIVERY,
      taskId: data.id,
      to: data.to,
      type: data.type,
      status: "SENT",
      timestamp: new Date(),
    };

    channel.sendToQueue(
      QUEUES.LOGS, 
      Buffer.from(JSON.stringify(logPayload)), 
      { persistent: true }
    );

    await saveDeliveryLog(data.id, data.type, data.to, "SENT");

    channel.ack(msg);
    return;
  } catch (err) {
    console.error("Delivery error:", err);
  }

  // ---------- RETRY LOGIC ----------
  if (retryCount < MAX_RETRIES) {
    const updatedRetry = retryCount + 1;

    console.log(`Retrying ${data.id} (${updatedRetry}/${MAX_RETRIES})`);

    channel.sendToQueue(
      QUEUES.MESSAGE, 
      msg.content, 
      {
        persistent: true,
        headers: { retryCount: updatedRetry },
      }
    );

    channel.ack(msg);
    return;
  }

  // ---------- FINAL FAILURE ----------
  console.log(`Final failure for task ${data.id}`);

  const failPayload: LogMessagePayload = {
    service: SERVICE_NAMES.DELIVERY,
    taskId: data.id,
    to: data.to,
    type: data.type,
    status: "FAILED",
    timestamp: new Date(),
  };

  channel.sendToQueue(
    QUEUES.LOGS, 
    Buffer.from(JSON.stringify(failPayload)), 
    { persistent: true });

  await saveDeliveryLog(data.id, data.type, data.to, "FAILED");

  channel.ack(msg);
};
