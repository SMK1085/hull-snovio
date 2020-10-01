import { Response, NextFunction, Router, Request } from "express";
import { v4 } from "uuid";
import { asValue, AwilixContainer } from "awilix";
import { get } from "lodash";

export const initializeScope = (
  router: Router,
  container: AwilixContainer,
): void => {
  router.use((req: Request, _res: Response, next: NextFunction): void => {
    // create a scoped container
    const scope = container.createScope();
    // Register all the stuff to the scope
    const correlationKey = req.headers["x-hulldx-correlationkey"]
      ? req.headers["x-hulldx-correlationkey"]
      : v4();
    scope.register("correlationKey", asValue(correlationKey));
    // Hull specific stuff
    if ((req as any).hull) {
      const hullContext = (req as any).hull;
      const clientConfig = hullContext.client.configuration();
      scope.register("hullAppId", asValue(clientConfig.id));
      scope.register("hullAppSecret", asValue(clientConfig.secret));
      scope.register("hullAppOrganization", asValue(clientConfig.organization));
      scope.register("hullAppToken", asValue(hullContext.token));
      scope.register("hullClient", asValue(hullContext.client));
      scope.register("hullMetricsClient", asValue(hullContext.metric));
      if (hullContext.ship) {
        scope.register("hullConnectorMeta", asValue(hullContext.ship));
        scope.register(
          "hullAppSettings",
          asValue(hullContext.ship.private_settings),
        );
      } else if (hullContext.connector) {
        scope.register("hullConnectorMeta", asValue(hullContext.connector));
        scope.register(
          "hullAppSettings",
          asValue(hullContext.connector.private_settings),
        );
      }
    } else if (
      req.query["ship"] &&
      req.query["secret"] &&
      req.query["organization"]
    ) {
      scope.register("hullAppId", asValue(req.query["ship"]));
      scope.register("hullAppSecret", asValue(req.query["secret"]));
      scope.register("hullAppOrganization", asValue(req.query["organization"]));
    }

    if (get(req, "body.notification_id", undefined) !== undefined) {
      req.headers["x-hulldx-kraken-notification-id"] = req.body.notification_id;
      scope.register(
        "hullKrakenNotificationId",
        asValue(req.body.notification_id),
      );
    }

    if (get(req, "body.kraken", undefined) !== undefined) {
      scope.register(
        "hullKrakenCheckpoints",
        asValue(get(req, "body.kraken.checkpoints", undefined)),
      );
      scope.register(
        "hullKrakenUpdateIds",
        asValue(get(req, "body.kraken.update-ids", undefined)),
      );
    }

    // assign the scope
    (req as any).scope = scope;

    next();
  });
};
