import { SyncAgent } from "../core/sync-agent";
import { cloneDeep, get, set } from "lodash";
import { AwilixContainer } from "awilix";
import { Logger } from "winston";
import IHullUserUpdateMessage from "../types/user-update-message";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const userUpdateHandlerFactory = (
  options: any = {},
): ((ctx: any, messages: IHullUserUpdateMessage[]) => Promise<any>) => {
  const { flowControl = null, isBatch = false } = options;
  return function userUpdateHandler(
    ctx: any,
    messages: IHullUserUpdateMessage[],
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
        const enrichedMessages = messages.map((m) => {
          const msg = {
            ...m,
          };
          set(msg, "user.account", get(m, "account", null));
          return msg;
        });
        return syncAgent.sendUserMessages(enrichedMessages, isBatch);
      }
      return Promise.resolve(true);
    } catch (error) {
      console.error(error);
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
