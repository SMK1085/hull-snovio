import { AwilixContainer, asClass } from "awilix";
import { ServiceClient } from "./service-client";
import { LoggingUtil } from "../utils/logging-util";
import { FilterUtil } from "../utils/filter-util";
import { MappingUtil } from "../utils/mapping-util";
import { ConnectorStatusResponse } from "../types/connector-status";
import { Logger } from "winston";
import { PrivateSettings } from "./connector";
import IHullClient from "../types/hull-client";
import { isNil, cloneDeep } from "lodash";
import {
  STATUS_SETUPREQUIRED_NOCLIENTID,
  ERROR_UNHANDLED_GENERIC,
  STATUS_SETUPREQUIRED_NOCLIENTSECRET,
} from "./messages";
import { ConnectorRedisClient } from "../utils/redis-client";
import IHullAccountUpdateMessage from "../types/account-update-message";
import asyncForEach from "../utils/async-foreach";
import { FieldsSchema } from "../types/fields-schema";
import IHullUserUpdateMessage from "../types/user-update-message";
import {
  META_FIELDS_PROSPECTINFO,
  OutgoingOperationEnvelope,
  SnovFindProspectbyUrlMessage,
  SnovFindProspectbyUrlRequestParams,
} from "./service-objects";
import { AmqpUtil } from "../utils/amqp-util";

export class SyncAgent {
  public readonly diContainer: AwilixContainer;

  constructor(container: AwilixContainer) {
    this.diContainer = container;
    const hullAppSettings = this.diContainer.resolve<PrivateSettings>(
      "hullAppSettings",
    );

    this.diContainer.register("serviceClient", asClass(ServiceClient));
    this.diContainer.register("loggingUtil", asClass(LoggingUtil));
    this.diContainer.register("filterUtil", asClass(FilterUtil));
    this.diContainer.register("mappingUtil", asClass(MappingUtil));
  }

  /**
   * Processes outgoing notifications for user:update lane.
   *
   * @param {IHullUserUpdateMessage[]} messages The notification messages.
   * @param {boolean} [isBatch=false] `True` if it is a batch; otherwise `false`.
   * @returns {Promise<void>} An awaitable Promise.
   * @memberof SyncAgent
   */
  public async sendUserMessages(
    messages: IHullUserUpdateMessage[],
    isBatch = false,
  ): Promise<void> {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");
    const connectorId = this.diContainer.resolve<string>("hullAppId");

    try {
      const appSettings = this.diContainer.resolve<PrivateSettings>(
        "hullAppSettings",
      );

      if (
        isNil(appSettings.client_id) ||
        isNil(appSettings.client_secret) ||
        isNil(appSettings.enrichment_user_lookup_socialurl)
      ) {
        // TODO: Log connector not configured in debug mode
        return;
      }

      const filterUtil = this.diContainer.resolve<FilterUtil>("filterUtil");
      const mappingUtil = this.diContainer.resolve<MappingUtil>("mappingUtil");

      const filteredEnvelopes = filterUtil.filterUserMessagesInitial(
        messages,
        isBatch,
      );

      const redisClient = this.diContainer.resolve<ConnectorRedisClient>(
        "redisClient",
      );
      let serviceClient = this.diContainer.resolve<ServiceClient>(
        "serviceClient",
      );

      if (filteredEnvelopes.actionables.length === 0) {
        // TODO: Log no-op
        return;
      }

      const cachedToken = await redisClient.get<{ access_token: string }>(
        `${connectorId}_accesstoken`,
      );
      if (isNil(cachedToken)) {
        const responseToken = await serviceClient.generateAccessToken();
        if (responseToken.success) {
          await redisClient.set(
            `${connectorId}_accesstoken`,
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
      const hullClient = this.diContainer.resolve<IHullClient>("hullClient");
      const amqpUtil = this.diContainer.resolve<AmqpUtil>("amqpUtil");
      const queueName = "snov-enrichbyurl";

      await asyncForEach(
        filteredEnvelopes.actionables,
        async (
          envelope: OutgoingOperationEnvelope<
            IHullUserUpdateMessage,
            SnovFindProspectbyUrlRequestParams
          >,
        ) => {
          // Send the call to the Enrich API of Snov.io
          const responseAdd = await serviceClient.addUrlToSearchForProspect(
            envelope.serviceObject!,
          );
          console.log(">>> Add Url result", responseAdd);
          if (responseAdd.success && responseAdd.data) {
            if (responseAdd.data.success === true) {
              // All good, enqueue the message to retrieve the result later
              const msgPayload: SnovFindProspectbyUrlMessage = {
                appSettings,
                connectorAuth: {
                  id: connectorId,
                  secret: this.diContainer.resolve<string>("hullAppSecret"),
                  organization: this.diContainer.resolve<string>(
                    "hullAppOrganization",
                  ),
                },
                user: envelope.message.user,
                lookupUrl: envelope.serviceObject!.url,
              };
              await amqpUtil.enqueueMessage(
                queueName,
                msgPayload,
                true,
                undefined,
                correlationKey,
              );
            } else {
              const failAttribs = mappingUtil.mapUserEnrichFailedToHullUserAttributes(
                responseAdd.data,
              );
              await hullClient
                .asUser(envelope.message.user)
                .traits(failAttribs);
            }
          } else {
            // This is usually a failure with the API, so it might be retried
            const apiFailureAttribs = mappingUtil.mapUserEnrichApiFailureToHullUserAttributes(
              responseAdd.errorDetails!,
            );
            await hullClient
              .asUser(envelope.message.user)
              .traits(apiFailureAttribs);
            // TODO: Add logging
          }
        },
      );
    } catch (error) {
      logger.error(
        loggingUtil.composeErrorMessage(
          "OPERATION_SENDUSERMESSAGES_UNHANDLED",
          error,
          correlationKey,
        ),
      );
    }
  }

  /**
   * Processes outgoing notifications for account:update lane.
   *
   * @param {IHullAccountUpdateMessage[]} messages The notification messages.
   * @param {boolean} [isBatch=false] `True` if it is a batch; otherwise `false`.
   * @returns {Promise<void>} An awaitable Promise.
   * @memberof SyncAgent
   */
  public async sendAccountMessages(
    messages: IHullAccountUpdateMessage[],
    isBatch = false,
  ): Promise<void> {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");
    const connectorId = this.diContainer.resolve<string>("hullAppId");

    try {
      // TODO: Logic goes here in a future release
    } catch (error) {
      logger.error(
        loggingUtil.composeErrorMessage(
          "OPERATION_SENDACCOUNTMESSAGES_UNHANDLED",
          error,
          correlationKey,
        ),
      );
    }
  }

  /**
   * Returns the fields schema for attribute mapping purposes.
   * @param objectType The arbitrary object type. Allowed values are `enrichmentbyurl`.
   * @param direction The direction. Allowed values are `incoming` or `outgoing`.
   * @returns {Promise<FieldsSchema>} The fields schema.
   * @memberof SyncAgent
   */
  public async listMetadata(
    objectType: string,
    direction: string,
  ): Promise<FieldsSchema> {
    const fieldSchema: FieldsSchema = {
      error: null,
      ok: true,
      options: [],
    };

    switch (objectType) {
      case "enrichmentbyurl":
        fieldSchema.options.push(...META_FIELDS_PROSPECTINFO);
        break;
      default:
        fieldSchema.error = `Unsupported object type '${objectType}'.`;
        fieldSchema.ok = false;
        break;
    }

    return fieldSchema;
  }

  /**
   * Determines the overall status of the connector.
   *
   * @returns {Promise<ConnectorStatusResponse>} The status response.
   * @memberof SyncAgent
   */
  public async determineConnectorStatus(): Promise<ConnectorStatusResponse> {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");

    const statusResult: ConnectorStatusResponse = {
      status: "ok",
      messages: [],
    };

    try {
      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_CONNECTORSTATUS_START",
          correlationKey,
        ),
      );

      const hullAppSettings = this.diContainer.resolve<PrivateSettings>(
        "hullAppSettings",
      );
      const hullClient = this.diContainer.resolve<IHullClient>("hullClient");
      const connectorId = this.diContainer.resolve<string>("hullAppId");

      const { client_id, client_secret } = hullAppSettings;

      // Perfom checks to verify setup is complete
      if (isNil(client_id)) {
        statusResult.status = "setupRequired";
        statusResult.messages.push(STATUS_SETUPREQUIRED_NOCLIENTID);
      }

      if (isNil(client_secret)) {
        statusResult.status = "setupRequired";
        statusResult.messages.push(STATUS_SETUPREQUIRED_NOCLIENTSECRET);
      }

      const appSecret = this.diContainer.resolve<string>("hullAppSecret");
      const appOrg = this.diContainer.resolve<string>("hullAppOrganization");
      const redisClient = this.diContainer.resolve<ConnectorRedisClient>(
        "redisClient",
      );
      const connectorAuth = {
        id: connectorId,
        secret: appSecret,
        organization: appOrg,
      };
      await redisClient.set(connectorId, connectorAuth, 60 * 60 * 12);

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_CONNECTORSTATUS_STARTHULLAPI",
          correlationKey,
        ),
      );

      await hullClient.put(`${connectorId}/status`, statusResult);

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_CONNECTORSTATUS_SUCCESS",
          correlationKey,
        ),
      );
    } catch (error) {
      const logPayload = loggingUtil.composeErrorMessage(
        "OPERATION_CONNECTORSTATUS_UNHANDLED",
        cloneDeep(error),
        correlationKey,
      );
      logger.error(logPayload);
      statusResult.status = "error";
      if (logPayload && logPayload.message) {
        statusResult.messages.push(logPayload.message);
      } else {
        statusResult.messages.push(ERROR_UNHANDLED_GENERIC);
      }
    }

    return statusResult;
  }
}
