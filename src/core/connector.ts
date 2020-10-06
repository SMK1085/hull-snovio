import { HullConnectorAttributeMapping } from "../types/hull-connector";

export interface PrivateSettings {
  client_id?: string | null;
  client_secret?: string | null;
  enrichment_user_synchronized_segments: string[];
  enrichment_user_lookup_socialurl?: string | null;
  enrichment_user_attributes_incoming: HullConnectorAttributeMapping[];
  emails_account_synchronized_segments: string[];
  emails_user_attributes_incoming: HullConnectorAttributeMapping[];
  access_token?: string | null;
  token_type?: string | null;
  expires_in?: number | null;
  expires_at?: string | null;
  prospectionlists_synchronizedis?: string[];
  prospectionlists_user_attributes_incoming: HullConnectorAttributeMapping[];
  prospectionlists_emailstrategy?: string | null;
}

export interface LogPayload {
  channel: "operational" | "metric" | "error";
  component: string;
  code: string;
  message?: string | null;
  metricKey?: string | null;
  metricValue?: number | null;
  errorDetails?: any | null;
  errorMessage?: string | null;
  appId: string;
  tenantId: string;
  correlationKey?: string;
}
