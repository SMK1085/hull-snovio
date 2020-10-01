import IHullUser, { IHullUserClaims } from "./user";
import IHullAccount, { IHullAccountClaims } from "./account";
import IHullAuxiliaryClaims from "./claims-auxiliary";

export default interface IHullClientConfig {
    id?: string;
    secret?: string,
    organization?: string,
    domain?: string,
    namespace?: string,
    requestId?: string,
    connectorName?: string,
    firehoseUrl?: string,
    protocol?: string,
    prefix?: string,
    userClaim?: string | IHullUserClaims,
    accountClaim?: string | IHullAccountClaims,
    subjectType?: IHullUser | IHullAccount,
    additionalClaims?: IHullAuxiliaryClaims,
    accessToken?: string,
    hostSecret?: string,
    flushAt?: number,
    flushAfter?: number,
    version?: string,
    logs?: any[],
    firehoseEvents?: any[],
    captureLogs?: boolean,
    captureFirehoseEvents?: boolean
}