import { Logger } from "winston";
import IHullSegment from "../types/hull-segment";
import IHullAccountUpdateMessage from "../types/account-update-message";
import {
  OutgoingOperationEnvelopesFiltered,
  SnovFindProspectbyUrlRequestParams,
} from "../core/service-objects";
import { get, intersection, isNil } from "lodash";
import {
  VALIDATION_SKIP_HULLOBJECT_NOTINANYSEGMENT,
  VALIDATION_SKIP_ENRICHMENT_NOLOOKUPURL,
} from "../core/messages";
import { PrivateSettings } from "../core/connector";
import IHullUserUpdateMessage from "../types/user-update-message";
import { MappingUtil } from "./mapping-util";

export class FilterUtil {
  public readonly privateSettings: PrivateSettings;
  public readonly logger: Logger;

  constructor(options: any) {
    this.privateSettings = options.hullAppSettings;
    this.logger = options.logger;
  }

  public filterUserMessagesInitial(
    messages: IHullUserUpdateMessage[],
    isBatch: boolean = false,
  ): OutgoingOperationEnvelopesFiltered<
    IHullUserUpdateMessage,
    SnovFindProspectbyUrlRequestParams
  > {
    const result: OutgoingOperationEnvelopesFiltered<
      IHullUserUpdateMessage,
      SnovFindProspectbyUrlRequestParams
    > = {
      actionables: [],
      skips: [],
    };

    messages.forEach((msg) => {
      if (
        !isBatch &&
        !FilterUtil.isInAnySegment(
          msg.segments,
          this.privateSettings.enrichment_user_synchronized_segments || [],
        )
      ) {
        result.skips.push({
          message: msg,
          operation: "skip",
          notes: [VALIDATION_SKIP_HULLOBJECT_NOTINANYSEGMENT("user")],
          objectType: "user",
        });
      } else {
        // Handle enrichment if the user has a value for the given lookup attribute,
        // otherwise skip it

        if (
          isNil(
            get(
              msg.user,
              this.privateSettings.enrichment_user_lookup_socialurl!,
              null,
            ),
          )
        ) {
          // Skip the ones without a value
          result.skips.push({
            message: msg,
            operation: "skip",
            notes: [
              VALIDATION_SKIP_ENRICHMENT_NOLOOKUPURL(
                this.privateSettings.enrichment_user_lookup_socialurl!,
              ),
            ],
            objectType: "user",
          });
        } else {
          const sanitizedUrl = MappingUtil.sanitizeLinkedInUrl(
            get(
              msg.user,
              this.privateSettings.enrichment_user_lookup_socialurl!,
              null,
            ) as string,
          );

          result.actionables.push({
            message: msg,
            operation: "enrich",
            objectType: "user",
            serviceObject: {
              url: sanitizedUrl,
            },
          });
        }
      }
    });

    return result;
  }

  public filterAccountMessagesInitial(
    messages: IHullAccountUpdateMessage[],
    isBatch: boolean = false,
  ): OutgoingOperationEnvelopesFiltered<IHullAccountUpdateMessage, unknown> {
    const result: OutgoingOperationEnvelopesFiltered<
      IHullAccountUpdateMessage,
      unknown
    > = {
      actionables: [],
      skips: [],
    };
    // TODO: Implement in future release for Domain.V2 search
    return result;
  }

  private static isInAnySegment(
    actualSegments: IHullSegment[],
    whitelistedSegments: string[],
  ): boolean {
    const actualIds = actualSegments.map((s) => s.id);
    if (intersection(actualIds, whitelistedSegments).length === 0) {
      return false;
    }

    return true;
  }
}
