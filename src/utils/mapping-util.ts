import { first, forEach, isNil, set } from "lodash";
import jsonata from "jsonata";
import { DateTime } from "luxon";
import { PrivateSettings } from "../core/connector";
import {
  SnovProspectInformation,
  SnovAddUrlForSearchResponse,
  SnovProspectListProspect,
  SnovProspectListProspectEmailDetails,
} from "../core/service-objects";
import { HullConnectorAttributeMapping } from "../types/hull-connector";
import { IHullUserAttributes } from "../types/user";
import normalizeUrl from "normalize-url";
import { AxiosError } from "axios";

const ATTRIBUTE_GROUP = "snov";

export class MappingUtil {
  public readonly appSettings: PrivateSettings;
  constructor(options: any) {
    this.appSettings = options.hullAppSettings;
  }

  public mapUserEnrichResultToHullUserAttributes(
    enrichResult: SnovProspectInformation,
  ): IHullUserAttributes {
    const attributes = {};

    // Loop over the result
    forEach(
      this.appSettings.enrichment_user_attributes_incoming,
      (mapping: HullConnectorAttributeMapping) => {
        if (!isNil(mapping.hull) && !isNil(mapping.service)) {
          // Handle only valid mappings here
          const expression = jsonata(mapping.service);
          const result = expression.evaluate(enrichResult);
          set(attributes, mapping.hull.replace("traits_", ""), {
            value: result,
            operation: mapping.overwrite === false ? "setIfNull" : "set",
          });
        }
      },
    );

    // Always set the id
    set(attributes, `${ATTRIBUTE_GROUP}/id`, {
      value: enrichResult.id,
      operation: "setIfNull",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/enriched_at`, {
      value: DateTime.utc().toISO(),
      operation: "set",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/enriched_success`, {
      value: true,
      operation: "set",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/enriched_error`, {
      value: null,
      operation: "set",
    });
    return attributes;
  }

  public mapUserEnrichFailedToHullUserAttributes(
    enrichResult: SnovAddUrlForSearchResponse,
  ): IHullUserAttributes {
    const attributes = {};

    set(attributes, `${ATTRIBUTE_GROUP}/enriched_at`, {
      value: DateTime.utc().toISO(),
      operation: "set",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/enriched_success`, {
      value: false,
      operation: "set",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/enriched_error`, {
      value: enrichResult.message || "Unknown reason.",
      operation: "set",
    });

    return attributes;
  }

  public mapUserEnrichApiFailureToHullUserAttributes(
    errorDetails: AxiosError,
  ): IHullUserAttributes {
    const attributes = {};

    set(attributes, `${ATTRIBUTE_GROUP}/enriched_at`, {
      value: DateTime.utc().toISO(),
      operation: "set",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/enriched_success`, {
      value: false,
      operation: "set",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/enriched_error`, {
      value: `${errorDetails.message} (code: ${errorDetails.code || "n/a"})`,
      operation: "set",
    });

    return attributes;
  }

  public mapUserProspectionListResultToHullUserAttributes(
    prospectData: SnovProspectListProspect,
    listName: string,
  ): IHullUserAttributes {
    const attributes = {};

    // Loop over the result
    forEach(
      this.appSettings.prospectionlists_user_attributes_incoming,
      (mapping: HullConnectorAttributeMapping) => {
        if (!isNil(mapping.hull) && !isNil(mapping.service)) {
          // Handle only valid mappings here
          const expression = jsonata(mapping.service);
          const result = expression.evaluate(prospectData);
          set(attributes, mapping.hull.replace("traits_", ""), {
            value: result,
            operation: mapping.overwrite === false ? "setIfNull" : "set",
          });
        }
      },
    );

    // Always set the id
    set(attributes, `${ATTRIBUTE_GROUP}/id`, {
      value: prospectData.id,
      operation: "setIfNull",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/prospect_imported_at`, {
      value: DateTime.utc().toISO(),
      operation: "set",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/prospect_list_first`, {
      value: listName,
      operation: "setIfNull",
    });

    set(attributes, `${ATTRIBUTE_GROUP}/prospect_list_latest`, {
      value: listName,
      operation: "set",
    });

    const primaryEmail = this.mapUserPrimaryEmailProspectionList(prospectData);
    if (!isNil(primaryEmail)) {
      set(attributes, `${ATTRIBUTE_GROUP}/prospect_primary_email`, {
        value: primaryEmail,
        operation: "set",
      });
    }

    return attributes;
  }

  public mapUserPrimaryEmailProspectionList(
    prospectData: SnovProspectListProspect,
  ): string | undefined {
    if (isNil(prospectData.emails) || prospectData.emails.length === 0) {
      return undefined;
    }

    let filteredEmails: SnovProspectListProspectEmailDetails[] = [];
    switch (this.appSettings.prospectionlists_emailstrategy) {
      case "HIGHEST_PROBABILITY_OVERALL":
        filteredEmails = prospectData.emails.sort((a, b) => {
          return parseFloat(b.probability) - parseFloat(a.probability);
        });
        break;
      case "HIGHEST_PROBABILITY_COMPANY":
        filteredEmails = prospectData.emails
          .filter((e) => e.domainType === "company_domain")
          .sort((a, b) => {
            return parseFloat(b.probability) - parseFloat(a.probability);
          });
        break;
      case "HIGHEST_PROBABILITY_VERIFIED_OVERALL":
        filteredEmails = prospectData.emails
          .filter((e) => e.isVerified === 1)
          .sort((a, b) => {
            return parseFloat(b.probability) - parseFloat(a.probability);
          });
        break;
      case "HIGHEST_PROBABILITY_VERIFIED_COMPANY":
        filteredEmails = prospectData.emails
          .filter(
            (e) => e.domainType === "company_domain" && e.isVerified === 1,
          )
          .sort((a, b) => {
            return parseFloat(b.probability) - parseFloat(a.probability);
          });
        break;
    }

    if (
      filteredEmails.length === 0 &&
      this.appSettings.prospectionlists_emailstrategy ===
        "HIGHEST_PROBABILITY_VERIFIED_COMPANY"
    ) {
      // Do one more attempt and try to get any company emails
      filteredEmails = prospectData.emails
        .filter((e) => e.domainType === "company_domain")
        .sort((a, b) => {
          return parseFloat(b.probability) - parseFloat(a.probability);
        });
    }

    if (filteredEmails.length === 0) {
      return first(prospectData.emails)!.email;
    }

    return first(filteredEmails)!.email;
  }

  public static sanitizeLinkedInUrl(raw: string): string {
    let result = raw;
    const REGEX_WEBSITE = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
    if (REGEX_WEBSITE.test(raw)) {
      result = normalizeUrl(raw, {
        defaultProtocol: "https:",
        forceHttps: true,
        normalizeProtocol: true,
        removeTrailingSlash: true,
        sortQueryParameters: true,
        stripAuthentication: true,
        stripHash: true,
        stripWWW: true,
      });
    }
    if (
      result.includes("linkedin.com") &&
      !result.includes("www.linkedin.com")
    ) {
      result = result.replace("linkedin.com", "www.linkedin.com");
    }

    return result;
  }
}
