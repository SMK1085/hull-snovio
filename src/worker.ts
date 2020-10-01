import { createContainer, asClass, asValue } from "awilix";
import {
  LoggerOptions,
  transports,
  createLogger,
  format,
  Logger,
} from "winston";
import LogzioWinstonTransport from "winston-logzio";
import { ClientOpts } from "redis";
import { ConnectorRedisClient } from "./utils/redis-client";
import { ServiceClient } from "./core/service-client";
import { MappingUtil } from "./utils/mapping-util";
import Hull from "hull";
import { LoggingUtil } from "./utils/logging-util";
import { AmqpUtil } from "./utils/amqp-util";
import { SnovFindProspectbyUrlMessage } from "./core/service-objects";
import { isNil } from "lodash";

const AMQP_QUEUE = "snov-enrichbyurl";

// DI Container
const container = createContainer();

// Instantiate the global logger
const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || "error",
  format: format.combine(format.simple()),
  defaultMeta: {
    service: process.env.LOG_SERVICENAME || "hull-snovio",
    environment: process.env.NODE_ENV || "development",
  },
};
// Add console as transport since we don't use a dedicated transport
// but rely on the OS to ship logs
if (process.env.LOGZIO_TOKEN) {
  loggerOptions.transports = [
    new LogzioWinstonTransport({
      token: process.env.LOGZIO_TOKEN as string,
      host: "listener.logz.io",
      protocol: "https",
      name: loggerOptions.defaultMeta.service,
      level: process.env.LOG_LEVEL || "error",
    }),
  ];
} else {
  loggerOptions.transports = [];
}

if (process.env.NODE_ENV === "development") {
  loggerOptions.transports.push(
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.timestamp(),
        format.align(),
        format.printf((info) => {
          const { timestamp, level, message, ...args } = info;
          const { meta } = info;
          let metaStructured = "";

          if (meta) {
            metaStructured = `${meta.component}#${meta.method}`;
            delete args.meta;
          }

          let appInfo = "";

          if (args.service) {
            appInfo = args.service;
            delete args.service;
          }

          return `[${appInfo}]  ${timestamp} | ${level} | ${metaStructured} |${message} ${
            Object.keys(args).length > 0 ? JSON.stringify(args, null, 2) : ""
          }`;
        }),
      ),
    }),
  );
}

const globalLogger = createLogger(loggerOptions);

// DI for Redis
const redisClientOpts: ClientOpts = {
  url: process.env.REDIS_URL,
};

// Register all the default jazz in the DI Container
container.register({
  redisClient: asClass(ConnectorRedisClient).singleton(),
  redisClientOpts: asValue(redisClientOpts),
  logger: asValue(globalLogger),
  appSecret: asValue(process.env.SECRET || "secret"),
  amqpUrl: asValue(process.env.CLOUDAMQP_URL),
  amqpUtil: asClass(AmqpUtil).singleton(),
});

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

(async () => {
  const logger = container.resolve<Logger>("logger");

  logger.debug(
    LoggingUtil.composeOperationalMessageGlobal("OPERATION_WORKER_START"),
  );

  const amqpUtil = container.resolve<AmqpUtil>("amqpUtil");
  let msgCountRegular = await amqpUtil.readQueueMessageCount(AMQP_QUEUE);

  if (process.env.NODE_ENV === "development") {
    console.log(`>> Queue load: ${msgCountRegular}`);
  }
  // Process regular queue
  const prefetchRegular = 1;

  await amqpUtil.consume(AMQP_QUEUE, prefetchRegular, async (msg) => {
    if (msg !== undefined && msg !== null) {
      const msgPayload = JSON.parse(
        msg.content.toString(),
      ) as SnovFindProspectbyUrlMessage;
      try {
        const loggingUtil = new LoggingUtil({
          hullAppId: msgPayload.connectorAuth.id,
          hullAppOrganization: msgPayload.connectorAuth.organization,
        });

        let appSettings = {
          ...msgPayload.appSettings,
        };
        let serviceClient = new ServiceClient({
          hullAppSettings: appSettings,
        });
        const redisClient = container.resolve<ConnectorRedisClient>(
          "redisClient",
        );
        const cachedToken = await redisClient.get<{ access_token: string }>(
          `${msgPayload.connectorAuth.id}_accesstoken`,
        );
        if (isNil(cachedToken)) {
          const responseToken = await serviceClient.generateAccessToken();
          if (responseToken.success) {
            await redisClient.set(
              `${msgPayload.connectorAuth.id}_accesstoken`,
              { access_token: responseToken.data!.access_token },
              responseToken.data!.expires_in - 30,
            );
            appSettings.access_token = responseToken.data!.access_token;
          } else {
            console.error(responseToken.errorDetails);
            throw new Error(`Couldn't retrieve access_token...`);
          }
        } else {
          // We have a cached token, so use it
          appSettings.access_token = cachedToken.access_token;
        }

        // Make sure we have an authenticated ServiceClient
        serviceClient = new ServiceClient({
          hullAppSettings: appSettings,
        });

        const mappingUtil = new MappingUtil({
          logger: globalLogger,
          hullAppSettings: appSettings,
        });
        const hullClient = new Hull(msgPayload.connectorAuth) as any;

        const responseFind = await serviceClient.getProspectWithUrl({
          url: msgPayload.lookupUrl,
        });

        if (responseFind.success) {
          let attribs;
          if (responseFind.data!.success === true) {
            attribs = mappingUtil.mapUserEnrichResultToHullUserAttributes(
              responseFind.data!.data!,
            );
          } else {
            attribs = mappingUtil.mapUserEnrichFailedToHullUserAttributes(
              responseFind.data as any,
            );
          }

          if (!isNil(attribs)) {
            await hullClient.asUser(msgPayload.user).traits(attribs);
          } else {
            // TODO: Decide what we do in this case
          }
          amqpUtil.acknowledge(msg);
        } else {
          // If we have already retried the message, log an error in Hull
          if (msg.fields.redelivered === true) {
            const apiFailureAttribs = mappingUtil.mapUserEnrichApiFailureToHullUserAttributes(
              responseFind.errorDetails!,
            );
            await hullClient.asUser(msgPayload.user).traits(apiFailureAttribs);
            amqpUtil.reject(msg, false);
          } else {
            // TODO: Log retry
            amqpUtil.reject(msg, true);
          }
        }
      } catch (error) {
        // TODO: Add logging for real unhandled exception
        console.error(error);
      }

      try {
        msgCountRegular = await amqpUtil.readQueueMessageCount(AMQP_QUEUE);
        if (process.env.NODE_ENV === "development") {
          console.log(`>> Queue load: ${msgCountRegular}`);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            `>> Failed to retrieve queue load: ${error.message}`,
            error,
          );
        }
      }
    }
  });
})();
