# Communication Aggregator System 🚀

## 📋 Overview
A scalable, microservices-based backend system designed to route messages (Email, SMS, WhatsApp) to their respective destinations. The system relies on **asynchronous communication** using RabbitMQ to ensure high availability and fault tolerance.

This project consists of three decoupled microservices:
1.  **Task Router:** Accepts API requests and pushes tasks/logs to queues.
2.  **Delivery Service:** Consumes tasks, simulates delivery with random failures, handles retries, and logs status to MongoDB.
3.  **Logger Service:** Consumes logs and indexes them into Elasticsearch for observability.

---

## 🏗 Architecture & Design Decisions

### High-Level Design (HLD)
* **Pattern:** Event-Driven Architecture (Producer-Consumer).
* **Communication:** Asynchronous Messaging via RabbitMQ.
* **Database Strategy:**
    * **MongoDB:** Operational storage for the Delivery Service to track the final status of messages.
    * **Elasticsearch:** Log aggregation for the Logging Service to allow searching and visualization (Kibana).

### Why this Tech Stack?
* **Node.js/Express:** For non-blocking I/O, perfect for handling high-throughput API requests.
* **RabbitMQ:** Chosen to decouple the API (Task Router) from the heavy lifting (Delivery). It ensures that if the Delivery service is down, messages aren't lost—they just wait in the queue.
* **Elasticsearch:** Requirements specified high observability; ES is industry standard for log ingestion.
* **Docker Compose:** Ensures all services and infrastructure (DBs, Broker) start with a single command.

---

## 🛠️ Prerequisites
* Docker & Docker Compose
* Node.js (v18+) & PNPM (or NPM)

---

## 🚀 How to Run

1.  **Start Infrastructure (RabbitMQ, Mongo, Elastic, Kibana)**
    ```bash
    docker-compose up -d
    ```
    *Wait for about 30-60 seconds for Elasticsearch and RabbitMQ to fully initialize.*

2.  **Install Dependencies**
    ```bash
    # Assuming root of monorepo
    pnpm install
    ```

3.  **Start Microservices**
    You can run them in separate terminals:

    * **Terminal 1 (Task Router):**
        ```bash
        cd apps/task-router
        pnpm dev
        ```
        *Runs on Port: 3001*

    * **Terminal 2 (Delivery Service):**
        ```bash
        cd apps/delivery-service
        pnpm dev
        ```

    * **Terminal 3 (Logger Service):**
        ```bash
        cd apps/logger-service
        pnpm dev
        ```

---

## 📡 API Usage & Postman

### Send Message
**Endpoint:** `POST http://localhost:3001/api/send`

**Headers:**
* `Content-Type: application/json`

**Body:**
```json
{
    "type": "email",
    "to": "user@example.com",
    "message": "Your OTP is 1234"
}