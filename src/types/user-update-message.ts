import IHullUser from "./user";
import IHullUserChanges from "./user-changes";
import IHullSegment from "./hull-segment";
import IHullUserEvent from "./user-event";
import IHullAccount from "./account";

export default interface IHullUserUpdateMessage {
  user: IHullUser;
  changes?: IHullUserChanges;
  segments: IHullSegment[];
  events: IHullUserEvent[];
  account?: IHullAccount | {};
  message_id: string;
}
