/* eslint-disable max-classes-per-file, @typescript-eslint/no-explicit-any */

declare module "hull" {
  import { Logger } from "winston";
  import { Application } from "express";

  const logger: Logger;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class Connector {
    constructor(config: any);

    public setupApp(app: Application): void;

    public startApp(app: Application): void;
  }

  export default Connector;
}

/* eslint-enable max-classes-per-file, @typescript-eslint/no-explicit-any */
