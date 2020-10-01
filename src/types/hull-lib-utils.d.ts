declare module 'hull/lib/utils' {
    import { RequestHandler } from "express";

    interface IOAuthHandlerConfig {
        name: string,
        tokenInUrl: boolean,
        isSetup: Function, // tslint:disable-line
        onAuthorize: Function, // tslint:disable-line
        onLogin: Function, // tslint:disable-line
        Strategy: Function, // tslint:disable-line
        views: any,
        options: any

    }
    export function oAuthHandler(config: IOAuthHandlerConfig): RequestHandler;
    export function notifHandler(config: any): RequestHandler;
    export function smartNotifierHandler(config: any): RequestHandler;
}