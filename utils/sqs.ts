// utils/sqs.ts
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

type BasePayload = {
  agentId: string;
  metadata?: any;
};

type FilePayload = BasePayload & {
  fileUrl: string;
  fileName: string;
};

type UrlPayload = BasePayload & {
  url: string;
};

type TextPayload = BasePayload & {
  text: string;
  source: string;
  type: string;
};

type QueueType = 'file' | 'url' | 'text';

const QUEUE_URLS: Record<QueueType, string> = {
  'file': process.env.AWS_SQS_FILE_QUEUE_URL!,
  'url': process.env.AWS_SQS_URL_QUEUE_URL!,
  'text': process.env.AWS_SQS_TEXT_QUEUE_URL!
};

export async function sendToProcessingQueue(
  payload: FilePayload | UrlPayload | TextPayload,
  queueType: QueueType
) {
  const queueUrl = QUEUE_URLS[queueType];
  if (!queueUrl) {
    throw new Error(`Queue URL not found for type: ${queueType}`);
  }

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(payload),
  });

  return sqs.send(command);
}

// Helper functions
export async function sendToFileQueue(payload: FilePayload) {
  return sendToProcessingQueue(payload, 'file');
}

export async function sendToUrlQueue(payload: UrlPayload) {
  return sendToProcessingQueue(payload, 'url');
}

export async function sendToTextQueue(payload: TextPayload) {
  return sendToProcessingQueue(payload, 'text');
}