import amqp, { Connection, Channel } from "amqplib";
import { v4 } from "uuid";

export class AmqpUtil {
  private readonly amqpUrl: string;
  private connection: Connection | undefined;
  private channel: Channel | undefined;

  constructor(options: any) {
    this.amqpUrl = options.amqpUrl;
  }

  public async connect(): Promise<void> {
    this.connection = await amqp.connect(this.amqpUrl);
  }

  public async createChannel(): Promise<void> {
    if (this.connection === undefined) {
      await this.connect();
    }

    this.channel = await this.connection?.createChannel();
  }

  public async ensureQueue(name: string, durable = true): Promise<void> {
    if (this.channel === undefined) {
      await this.createChannel();
    }

    this.channel?.assertQueue(name, { durable });
  }

  public async enqueueMessage<TPayload>(
    queueName: string,
    content: TPayload,
    persistent = true,
    headers?: any,
    correlationId?: string,
  ): Promise<boolean | undefined> {
    await this.ensureQueue(queueName);
    const msg = JSON.stringify(content);
    const enqueued = await this.channel?.sendToQueue(
      queueName,
      Buffer.from(msg),
      {
        persistent,
        headers,
        correlationId,
        messageId: v4(),
      },
    );
    return enqueued;
  }

  public async consume(
    queueName: string,
    prefetchCount: number,
    onMessage: (msg: amqp.ConsumeMessage | null) => any,
  ): Promise<void> {
    await this.ensureQueue(queueName);
    await this.channel?.prefetch(prefetchCount);
    await this.channel?.consume(queueName, onMessage);
  }

  public reject(msg: amqp.Message, requeue = false): void {
    this.channel?.reject(msg, requeue);
  }

  public acknowledge(msg: amqp.Message): void {
    this.channel?.ack(msg);
  }

  public async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
    }
  }

  public async closeChannel(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
  }

  public async readQueueMessageCount(
    queueName: string,
  ): Promise<number | undefined> {
    await this.ensureQueue(queueName);
    const qChecked = await this.channel?.checkQueue(queueName);
    return qChecked?.messageCount;
  }
}
