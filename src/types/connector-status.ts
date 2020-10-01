type ConnectorStatusType = "ok" | "warning" | "error" | "setupRequired";

export interface ConnectorStatusResponse {
  status: ConnectorStatusType;
  messages: string[];
}
