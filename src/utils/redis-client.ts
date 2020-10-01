import redis, { RedisClient } from "redis";

const COMPONENT_ID = "utils.ConnectorRedisClient";

export class ConnectorRedisClient {
  private readonly redisClient: RedisClient;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly logger: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(opts: any) {
    this.logger = opts.logger || console;
    this.redisClient = redis.createClient(opts.redisClientOpts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.redisClient.on("error", (err: any) => {
      this.logger.error({
        message: `Unhandled error in Redis client. See error for details.`,
        meta: {
          component: COMPONENT_ID,
          method: "redisClient.onError",
        },
        error: err,
      });
    });
  }

  public async set<T>(
    key: string,
    value: T,
    expiresSecs?: number,
  ): Promise<string> {
    const logMeta = {
      component: COMPONENT_ID,
      method: "set<T>",
    };

    let redisVal = JSON.stringify(value);
    if (typeof value === "string") {
      redisVal = value;
    }
    this.logger.debug({
      message: `Setting key ${key} in Redis to value '${redisVal}' ${
        expiresSecs
          ? `,expires in ${expiresSecs} seconds.`
          : "without expiration."
      }`,
      meta: logMeta,
      value: redisVal,
    });
    if (expiresSecs === undefined) {
      return new Promise(
        (
          resolve: (value?: string | PromiseLike<string> | undefined) => void,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          reject: (reason?: any) => void,
        ) => {
          this.redisClient.set(
            key,
            redisVal,
            (err: Error | null, result: string) => {
              if (err !== null) {
                this.logger.error({
                  message: `Failed to set key ${key} in Redis to value '${redisVal}' without expiration. See error for details.`,
                  meta: logMeta,
                  error: err,
                });
                return reject(err);
              }

              this.logger.debug({
                message: `Successfully set key ${key} in Redis to value '${redisVal}' without expiration.`,
                meta: logMeta,
                result,
              });
              return resolve(result);
            },
          );
        },
      );
    }

    return new Promise(
      (
        resolve: (value?: string | PromiseLike<string> | undefined) => void,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (reason?: any) => void,
      ) => {
        this.redisClient.setex(
          key,
          expiresSecs,
          redisVal,
          (err: Error | null, result: string) => {
            if (err !== null) {
              this.logger.error({
                message: `Failed to set key ${key} in Redis to value '${redisVal}' with expiration of ${expiresSecs} seconds. See error for details.`,
                meta: logMeta,
                error: err,
              });
              return reject(err);
            }

            this.logger.debug({
              message: `Successfully set key ${key} in Redis to value '${redisVal}' with expiration in ${expiresSecs} seconds.`,
              meta: logMeta,
              result,
            });
            return resolve(result);
          },
        );
      },
    );
  }

  public async hmSet<T>(
    key: string,
    hashSet: { [key: string]: T },
    expiresSecs?: number,
  ): Promise<string> {
    const logMeta = {
      component: COMPONENT_ID,
      method: "hmSet<T>",
    };

    this.logger.debug({
      message: `Setting HMSET for key ${key}...`,
      meta: logMeta,
      value: hashSet,
    });

    const redisVal: { [key: string]: string } = {};
    Object.keys(hashSet).forEach((k) => {
      redisVal[k] = JSON.stringify(hashSet[k]);
    });

    return new Promise(
      (
        resolve: (value?: string | PromiseLike<string> | undefined) => void,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (reason?: any) => void,
      ) => {
        this.redisClient.HMSET(
          key,
          redisVal,
          (err: Error | null, result: string) => {
            if (err !== null) {
              this.logger.error({
                message: `Failed to set HMSET for key ${key}. See error for details.`,
                meta: logMeta,
                value: hashSet,
                error: err,
              });
              return reject(err);
            }

            if (expiresSecs !== undefined) {
              this.redisClient.expire(
                key,
                expiresSecs,
                (err2: Error | null, result2: number) => {
                  if (err2 !== null) {
                    this.logger.error({
                      message: `Failed to expire key ${key}. See error for details`,
                      meta: logMeta,
                      error: err2,
                    });
                    return reject(err2);
                  }

                  this.logger.debug({
                    message: `Expiring key ${key} affected ${result2} record(s).`,
                    meta: logMeta,
                  });

                  this.logger.debug({
                    message: `Successfully set expiration for HMSET with key ${key}...`,
                    meta: logMeta,
                    value: hashSet,
                    result,
                  });
                  return resolve(result);
                },
              );
            }

            this.logger.debug({
              message: `Successfully set HMSET for key ${key}...`,
              meta: logMeta,
              value: hashSet,
              result,
            });
            return resolve(result);
          },
        );
      },
    );
  }

  public async get<T>(key: string): Promise<T | undefined> {
    const logMeta = {
      component: COMPONENT_ID,
      method: "get<T>",
    };

    this.logger.debug({
      message: `Retrieving key '${key}' from Redis...`,
      meta: logMeta,
    });

    return new Promise(
      (
        resolve: (value?: T | PromiseLike<T> | undefined) => void,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (reason?: any) => void,
      ) => {
        this.redisClient.get(
          key,
          (err: Error | null, result: string | undefined | null) => {
            if (err !== null) {
              this.logger.error({
                message: `Failed to retriev key '${key}' from Redis. See error for details`,
                meta: logMeta,
                error: err,
              });
              return reject(err);
            }

            this.logger.debug({
              message: `Successfully retrieved key '${key}' from Redis.`,
              meta: logMeta,
            });

            if (result === undefined || result === null) {
              return resolve(undefined);
            }

            try {
              const data = JSON.parse(result) as T;
              return resolve(data);
            } catch (error) {
              return resolve(result as any);
            }

          },
        );
      },
    );
  }

  public async getAll<T>(
    key: string,
  ): Promise<{ [key: string]: T } | undefined> {
    const logMeta = {
      component: COMPONENT_ID,
      method: "getAll<T>",
    };

    this.logger.debug({
      message: `Retrieving HMSET for key '${key}' from Redis...`,
      meta: logMeta,
    });

    return new Promise(
      (
        resolve: (
          value?:
            | { [key: string]: T }
            | PromiseLike<{ [key: string]: T }>
            | undefined,
        ) => void,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (reason?: any) => void,
      ) => {
        this.redisClient.hgetall(
          key,
          (
            err: Error | null,
            result: { [key: string]: string } | undefined,
          ) => {
            if (err !== null) {
              this.logger.debug({
                message: `Failed to retrieve HMSET for key '${key}' from Redis. See error for details.`,
                meta: logMeta,
                error: err,
              });
              return reject(err);
            }

            this.logger.debug({
              message: `Successfully retrieved HMSET for key '${key}' from Redis.`,
              meta: logMeta,
              result,
            });

            if (result === undefined || result === null) {
              return resolve(undefined);
            }

            const data: { [key: string]: T } = {};
            Object.keys(result).forEach((k) => {
              data[k] = JSON.parse(result[k]) as T;
            });

            return resolve(data);
          },
        );
      },
    );
  }

  public async delete(key: string): Promise<number> {
    const logMeta = {
      component: COMPONENT_ID,
      method: "delete",
    };

    this.logger.debug({
      message: `Deleting key '${key}' from Redis...`,
      meta: logMeta,
    });
    return new Promise(
      (
        resolve: (value?: number | PromiseLike<number> | undefined) => void,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (reason?: any) => void,
      ) => {
        this.redisClient.del(
          key,
          (err: Error | null, result: number | undefined) => {
            if (err !== null) {
              this.logger.error({
                message: `Failed to delete key '${key}' from Redis. See error for details.`,
                meta: logMeta,
                error: err,
              });
              return reject(err);
            }

            this.logger.debug({
              message: `Successfully deleted key '${key}' from Redis.`,
              meta: logMeta,
              result,
            });
            return resolve(result);
          },
        );
      },
    );
  }

  public async delHash(key: string, field: string): Promise<number> {
    const logMeta = {
      component: COMPONENT_ID,
      method: "delHash",
    };

    this.logger.info({
      message: `Deleting field ${field} for key '${key}' from Redis...`,
      meta: logMeta,
    });
    return new Promise(
      (
        resolve: (value?: number | PromiseLike<number> | undefined) => void,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (reason?: any) => void,
      ) => {
        this.redisClient.HDEL(
          key,
          field,
          (err: Error | null, result: number | undefined) => {
            if (err !== null) {
              this.logger.error({
                message: `Failed to delete field '${field}' for key '${key}' from Redis. See error for details.`,
                meta: logMeta,
                error: err,
              });
              return reject(err);
            }

            this.logger.info({
              message: `Successfully deleted ${result} field(s) from Redis.`,
              meta: logMeta,
              result,
            });
            return resolve(result);
          },
        );
      },
    );
  }

  public async quit(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.redisClient.quit((err: Error | null) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }

  public end(): void {
    this.redisClient.end(true);
  }
}
