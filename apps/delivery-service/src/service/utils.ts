import { TaskMessagePayload } from "@repo/shared";
import { Message } from "amqplib";

export const simulateDelivery = async (type: string, to: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 2000 + 1000;

    console.log(`Sending ${type} to ${to}...`);

    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error("Delivery failed"));
      } else {
        console.log(`Delivered ${type} to ${to}`);
        resolve();
      }
    }, delay);
  });
};

export const parseTaskMessage = (msg: Message): TaskMessagePayload | null => {
  try {
    return JSON.parse(msg.content.toString());
  } catch (err) {
    console.error("Invalid message JSON:", err);
    return null;
  }
};