export const STATUS_SETUPREQUIRED_NOCLIENTID =
  "Connector unauthenticated: No Client ID is present.";
export const STATUS_SETUPREQUIRED_NOCLIENTSECRET =
  "Connector unauthenticated: No Client Secret is present.";
export const ERROR_UNHANDLED_GENERIC = `An unhandled error occurred and our engineering team has been notified.`;

export const VALIDATION_SKIP_HULLOBJECT_NOTINANYSEGMENT = (
  objectType: "user" | "account",
) => {
  return `Hull ${objectType} won't be synchronized since it is not matching any of the filtered segments.`;
};

export const DATAFLOW_BATCHOP_SKIPFILTER = (objectType: "user" | "account") => {
  return `Hull ${objectType} synchronized in batch operation. Segment filters not applied.`;
};

export const VALIDATION_SKIP_HULLACCOUNT_NODOMAIN =
  "Hull account doesn't have a value for attribute domain.";

export const VALIDATION_SKIP_ENRICHMENT_NOLOOKUPURL = (
  attributeName: string,
) => {
  return `Hull user doesn't have a value for attribute '${attributeName}' which is the LinkedIn or Twitter Url and is required to run enrichment.`;
};

export const OPERATION_SKIP_USERALREADYSENT =
  "The account has been already sent to Snov.io within the past 24 hours.";
