import { Application } from "express";
import { smartNotifierHandler } from "hull/lib/utils";
import { createContainer, asValue, asClass } from "awilix";
import { createLogger, LoggerOptions, format, transports } from "winston";
import actions from "./actions";
import cors from "cors";
import _ from "lodash";
import { ClientOpts } from "redis";
import { ConnectorRedisClient } from "./utils/redis-client";
import LogzioWinstonTransport from "winston-logzio";
import { initializeScope } from "./middleware/express-scope";
import { CachingUtil } from "./utils/caching-util";
import { AmqpUtil } from "./utils/amqp-util";

export const server = (app: Application): Application => {
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

  // Register all the defualt jazz in the DI Container
  container.register({
    redisClient: asClass(ConnectorRedisClient).singleton(),
    redisClientOpts: asValue(redisClientOpts),
    logger: asValue(globalLogger),
    appSecret: asValue(process.env.SECRET || "secret"),
    cachingUtil: asClass(CachingUtil).singleton(),
    amqpUrl: asValue(process.env.CLOUDAMQP_URL),
    amqpUtil: asClass(AmqpUtil).singleton(),
  });

  // Apply general purpose middleware depending on DI
  initializeScope(app, container);

  // Set the view engine to ejs
  app.set("view engine", "ejs");

  // Hull platform handler endpoints
  app.post("/smart-notifier", (req, res, next) => {
    smartNotifierHandler({
      handlers: {
        "user:update": actions.userUpdate({
          flowControl: {
            type: "next",
            size: parseInt(_.get(process.env.FLOW_CONTROL_SIZE, "50"), 10),
            in: parseInt(_.get(process.env.FLOW_CONTROL_IN, "5"), 10),
            in_time: parseInt(
              _.get(process.env.FLOW_CONTROL_IN_TIME, "60000"),
              10,
            ),
          },
          req,
        }),
        "account:update": actions.accountUpdate({
          flowControl: {
            type: "next",
            size: parseInt(_.get(process.env.FLOW_CONTROL_SIZE, "30"), 10),
            in: parseInt(_.get(process.env.FLOW_CONTROL_IN, "5"), 10),
            in_time: parseInt(
              _.get(process.env.FLOW_CONTROL_IN_TIME, "60000"),
              10,
            ),
          },
          req,
        }),
      },
    })(req, res, next);
  });

  app.post("/batch", (req, res, next) => {
    smartNotifierHandler({
      userHandlerOptions: {
        groupTraits: false,
      },
      handlers: {
        "user:update": actions.userUpdate({ isBatch: true, req }),
        "account:update": actions.accountUpdate({ isBatch: true, req }),
      },
    })(req, res, next);
  });

  /*app.post("/batch-accounts", (req, res, next) => {
    smartNotifierHandler({
      userHandlerOptions: {
        groupTraits: false,
      },
      handlers: {
        "account:update": actions.accountUpdate({ isBatch: true, req }),
      },
    })(req, res, next);
  });*/

  // Status endpoints
  app.use("/status", actions.status());

  // CORS enabled endpoints
  app.use("/meta/:category/:objectType/:direction", cors(), actions.meta());
  app.use("/fetch/prospectlists", cors(), actions.fetch());

  // Dispose the container when the server closes
  app.on("close", () => {
    globalLogger.debug("Shutting down application on CLOSE...");
    container.dispose();
  });

  process.on("SIGINT", () => {
    globalLogger.debug("Shutting down application on SIGINT...");
    if (!container) {
      return;
    }
    container.dispose();
  });

  return app;
};
