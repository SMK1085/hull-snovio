import IHullAccountUpdateMessage from "../types/account-update-message";
import { SyncAgent } from "../core/sync-agent";
import { cloneDeep } from "lodash";
import { AwilixContainer } from "awilix";
import { Logger } from "winston";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const accountUpdateHandlerFactory = (
  options: any = {},
): ((ctx: any, messages: IHullAccountUpdateMessage[]) => Promise<any>) => {
  const { flowControl = null, isBatch = false } = options;
  return function accountUpdateHandler(
    ctx: any,
    messages: IHullAccountUpdateMessage[],
  ): Promise<any> {
    let logger: Logger | undefined;
    let correlationKey: string | undefined;

    try {
      if (ctx.smartNotifierResponse && flowControl) {
        ctx.smartNotifierResponse.setFlowControl(flowControl);
      }
      const scope = (options.req as any).scope as AwilixContainer;
      logger = scope.resolve<Logger>("logger");
      correlationKey = scope.resolve<string>("correlationKey");
      const syncAgent = new SyncAgent(scope);

      if (messages.length > 0) {
        return syncAgent.sendAccountMessages(messages, isBatch);
      }
      return Promise.resolve(true);
    } catch (error) {
      if (logger) {
        logger.error({
          code: `ERR-01-001`,
          message: `Unhandled exception at route '${options.req.method} ${options.req.url}'`,
          correlationKey,
          errorDetails: cloneDeep(error),
        });
      }
      return Promise.reject(error);
    }
  };
};

/* eslint-enable @typescript-eslint/no-explicit-any */
