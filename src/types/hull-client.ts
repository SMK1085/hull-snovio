import { IHullUserClaims } from "./user";
import IHullAuxiliaryClaims from "./claims-auxiliary";
import { IHullAccountClaims } from "./account";
import IHullEntityAttributes from "./entity-attributes";
import { IHullUserEventContext, IHullUserEventProps } from "./user-event";
import IHullClientLogger from "./hull-client-logger";

export default interface IHullClient {
    logger: IHullClientLogger;
    utils: any;
    api: (url: string, method: string, params: any, options?: any) => Promise<any>;
    get: (url: string, params?: any, options?: any) => Promise<any>;
    post: (url: string, params: any, options?: any) => Promise<any>;
    del: (url: string, params?: any, options?: any) => Promise<any>;
    put: (url: string, params?: any, options?: any) => Promise<any>;
    asUser: (userClaim: string | IHullUserClaims, additionalClaims?: IHullAuxiliaryClaims) => IHullUserScopedClient;
    asAccount: (accountClaim: string | IHullAccountClaims, additionalClaims?: IHullAuxiliaryClaims) => IHullEntityScopedClient;
}

export interface IHullEntityScopedClient extends IHullClient {
    traits: (traits: IHullEntityAttributes) => Promise<any>;
}

export interface IHullUserScopedClient extends IHullEntityScopedClient {
    account: (accountClaim: IHullAccountClaims) => IHullEntityScopedClient;
    track: (event: string, properties: IHullUserEventProps, context: IHullUserEventContext) => Promise<any>;
}