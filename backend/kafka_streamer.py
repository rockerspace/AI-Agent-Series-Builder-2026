import os
import json
import asyncio
import logging
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer

logger = logging.getLogger("EcoPulseKafka")

KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_NAME = "climate-events"

producer = None
mock_queue = asyncio.Queue()

async def init_kafka_producer():
    global producer
    try:
        producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
        await producer.start()
        logger.info(f"Kafka Producer started successfully. Connected to {KAFKA_BOOTSTRAP_SERVERS}.")
    except Exception as e:
        logger.warning(f"Failed to start Kafka Producer: {e}. Running in standalone mock mode.")
        producer = None

async def stop_kafka_producer():
    if producer:
        await producer.stop()

async def send_kafka_event(event_type: str, data: dict):
    """Sends event payload to Kafka topic or logs to mock stream."""
    payload = {
        "event_type": event_type,
        "payload": data
    }
    serialized = json.dumps(payload).encode('utf-8')
    if producer:
        try:
            await producer.send_and_wait(TOPIC_NAME, serialized)
            logger.info(f"Published event '{event_type}' to Kafka topic '{TOPIC_NAME}'.")
        except Exception as e:
            logger.error(f"Error publishing to Kafka: {e}")
    else:
        logger.info(f"[Mock Stream] Broadcasting event: {payload}")
        await mock_broadcast(payload)

async def mock_broadcast(event: dict):
    if mock_queue.qsize() > 100:
        try:
            mock_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
    await mock_queue.put(event)

async def event_generator():
    """Asynchronous generator to yield events for FastAPI SSE streaming."""
    # Attempt to consume from Kafka if producer is active
    if producer:
        consumer = AIOKafkaConsumer(
            TOPIC_NAME,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id="ecopulse-sse-group",
            auto_offset_reset="latest"
        )
        try:
            await consumer.start()
            logger.info("Kafka SSE Consumer subscribed and listening.")
            while True:
                msg_batch = await consumer.getmany(timeout_ms=1000)
                for tp, messages in msg_batch.items():
                    for msg in messages:
                        yield f"data: {msg.value.decode('utf-8')}\n\n"
        except Exception as e:
            logger.warning(f"Could not start Kafka Consumer: {e}. Falling back to Mock Stream.")
        finally:
            try:
                await consumer.stop()
            except Exception:
                pass

    # Fallback to local Queue streaming
    while True:
        try:
            event = await mock_queue.get()
            yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.error(f"Error in Mock Consumer: {e}")
            await asyncio.sleep(1)
