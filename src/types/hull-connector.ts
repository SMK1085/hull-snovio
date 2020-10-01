export interface HullConnectorAuth {
  id: string;
  secret: string;
  organization: string;
}

export interface HullConnectorAttributeMapping {
  service?: string | null;
  hull?: string | null;
  readOnly?: boolean | null;
  overwrite?: boolean | null;
}

export interface HullConnectorIdentityMapping {
  service?: string | null;
  hull?: string | null;
  required?: boolean | null;
}
