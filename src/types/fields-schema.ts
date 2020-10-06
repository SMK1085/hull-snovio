export interface FieldsSchema {
  ok: boolean;
  error: null | string;
  options: FieldsSchemaOption[];
}

interface FieldsSchemaOption {
  value: string | number;
  label: string;
}
