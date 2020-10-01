import { HullAttribute } from "./common-types";

export interface IHullUserClaims {
  id?: string | null | undefined;
  email?: string | null | undefined;
  external_id?: string | null | undefined;
  anonymous_id?: string | null | undefined;
}

export default interface IHullUser {
  id: string;
  email: string | null;
  external_id: string | null;
  anonymous_id?: string | null;
  [propName: string]: HullAttribute;
}

export interface IHullUserAttributes {
  [propName: string]: HullAttribute;
}
