import { HullConnectorAuth } from "../types/hull-connector";
import { IHullUserAttributes } from "../types/user";
import { PrivateSettings } from "./connector";

export type ApiMethod =
  | "delete"
  | "get"
  | "GET"
  | "DELETE"
  | "head"
  | "HEAD"
  | "options"
  | "OPTIONS"
  | "post"
  | "POST"
  | "put"
  | "PUT"
  | "patch"
  | "PATCH"
  | "link"
  | "LINK"
  | "unlink"
  | "UNLINK";

export interface ApiResultObject<TPayload, TData, TError> {
  endpoint: string;
  method: ApiMethod;
  payload: TPayload | undefined;
  data?: TData;
  success: boolean;
  error?: string | string[];
  errorDetails?: TError;
}

export type OutgoingOperationType = "enrich" | "skip";
export type OutgoingOperationObjectType = "user" | "event" | "account";

export interface OutgoingOperationEnvelope<TMessage, TServiceObject> {
  message: TMessage;
  serviceObject?: TServiceObject;
  operation: OutgoingOperationType;
  objectType: OutgoingOperationObjectType;
  notes?: string[];
}

export interface OutgoingOperationEnvelopesFiltered<TMessage, TServiceObject> {
  actionables: OutgoingOperationEnvelope<TMessage, TServiceObject>[];
  skips: OutgoingOperationEnvelope<TMessage, TServiceObject>[];
}

export interface SnovAuthRequestParams {
  grant_type: "client_credentials";
  client_id: string;
  client_secret: string;
}

export interface SnovAuthRequestResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface SnovFindProspectbyUrlRequestParams {
  url: string;
}

export interface SnovAddUrlForSearchResponse {
  success?: boolean;
  message?: string;
}

export interface SnovGetProspectWithUrlResponse {
  success: boolean;
  data?: SnovProspectInformation;
}

export interface SnovProspectInformation {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  sourcePage: string;
  source: string;
  industry: string;
  country: string;
  locality: string;
  skills: string[];
  links?: any | null;
  currentJob: SnovProspectInformationJob[];
  previousJob: SnovProspectInformationJob[];
  social: string[];
  emails: { email: string; status: string }[];
}

export interface SnovProspectInformationJob {
  companyName: string;
  position: string;
  socialLink: string | null;
  site: string | null;
  locality: string | null;
  state: string | null;
  city: string | null;
  street: string | null;
  street2: string | null;
  postal: string | null;
  founded: string | null;
  startDate: string | null;
  endDate: string | null;
  size: string | null;
  industry: string | null;
  companyType: string | null;
  country: string | null;
}

export interface SnovDomainSearchV2Params {
  domain: string;
  type: "all" | "generic" | "personal";
  limit: number;
  lastId: number;
}

export interface SnovDomainSearchV2Response {
  success: boolean;
  domain: string;
  webmail: boolean;
  result: number;
  lastId: number;
  limit: number;
  companyName: string;
  emails: SnovDomainSearchV2Email[];
}

export interface SnovDomainSearchV2Email {
  email: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  sourcePage?: string;
  companyName?: string;
  type?: string;
  status?: string;
}

export interface SnovFindProspectbyUrlMessage {
  connectorAuth: HullConnectorAuth;
  appSettings: PrivateSettings;
  user: IHullUserAttributes;
  lookupUrl: string;
}

export interface SnovDateObject {
  date: string;
  timezone_type: number;
  timezone: string;
}

export interface SnovList {
  id: number;
  name: string;
  contacts: number;
  isDeleted: boolean;
  creationDate: SnovDateObject;
  deletionDate: null | SnovDateObject;
}

export interface SnovProspectListRequestParams {
  listId: number;
  page?: number;
  perPage?: number; // Max is 100
}

export interface SnovProspectListResponse {
  success: boolean;
  message?: string;
  list?: {
    name: string;
    contacts: number;
    creationDate: SnovDateObject;
    emailsCount: any[];
  };
  prospects: SnovProspectListProspect[];
}

export interface SnovProspectListProspect {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  emails: SnovProspectListProspectEmailDetails[];
}

export interface SnovProspectListProspectEmailDetails {
  email: string;
  probability: string;
  isVerified: null | number;
  jobStatus: string;
  domainType: string;
  isValidFormat: string | null;
  isDisposable: string | null;
  isWebmail: string | null;
  isGibberish: string | null;
  smtpStatus: string | null;
  emailVerifyText: string | null;
}

export const META_FIELDS_PROSPECTINFO = [
  {
    label: "ID",
    value: "id",
  },
  {
    label: "First Name",
    value: "firstName",
  },
  {
    label: "Last Name",
    value: "lastName",
  },
  {
    label: "Source Page",
    value: "sourcePage",
  },
  {
    label: "Source",
    value: "source",
  },
  {
    label: "Industry",
    value: "industry",
  },
  {
    label: "Country",
    value: "country",
  },
  {
    label: "Locality",
    value: "locality",
  },
  {
    label: "Skills",
    value: "skills",
  },
  {
    label: "Current Job Company Name",
    value: "currentJob[0].companyName",
  },
  {
    label: "Current Job Position",
    value: "currentJob[0].position",
  },
  {
    label: "Current Job Social Link",
    value: "currentJob[0].socialLink",
  },
  {
    label: "Current Job Website",
    value: "currentJob[0].site",
  },
  {
    label: "Current Job Locality",
    value: "currentJob[0].locality",
  },
  {
    label: "Current Job State",
    value: "currentJob[0].state",
  },
  {
    label: "Current Job City",
    value: "currentJob[0].city",
  },
  {
    label: "Current Job Street",
    value: "currentJob[0].street",
  },
  {
    label: "Current Job Postal",
    value: "currentJob[0].postal",
  },
  {
    label: "Current Job Founded",
    value: "currentJob[0].founded",
  },
  {
    label: "Current Job Start Date",
    value: "currentJob[0].startDate",
  },
  {
    label: "Current Job End Date",
    value: "currentJob[0].endDate",
  },
  {
    label: "Current Job Company Size",
    value: "currentJob[0].size",
  },
  {
    label: "Current Job Industry",
    value: "currentJob[0].industry",
  },
  {
    label: "Current Job Company Type",
    value: "currentJob[0].companyType",
  },
  {
    label: "Current Job Country",
    value: "currentJob[0].country",
  },
  {
    label: "Current Jobs",
    value: "currentJob",
  },
  {
    label: "Social",
    value: "social",
  },
  {
    label: "Emails",
    value: "emails.email",
  },
  {
    label: "Emails Detailed",
    value: "emails",
  },
];

export const META_FIELDS_PROSPECTLISTS = [
  {
    label: "ID",
    value: "id",
  },
  {
    label: "First Name",
    value: "firstName",
  },
  {
    label: "Last Name",
    value: "lastName",
  },
  {
    label: "Prospection Source",
    value: "sourcePage",
  },
  {
    label: "Emails",
    value: "emails.email",
  },
  {
    label: "Emails Detailed",
    value: "emails",
  },
];

export const META_STRATEGIES_PROSPECTLISTS = [
  {
    label: "Highest Probability",
    value: "HIGHEST_PROBABILITY_OVERALL",
  },
  {
    label: "Highest Probability with Company Domain",
    value: "HIGHEST_PROBABILITY_COMPANY",
  },
  {
    label: "Highest Probability with Verified Domain",
    value: "HIGHEST_PROBABILITY_VERIFIED_OVERALL",
  },
  {
    label: "Highest Probability with Verified Company Domain",
    value: "HIGHEST_PROBABILITY_VERIFIED_COMPANY",
  },
];
