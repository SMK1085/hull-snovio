import IHullSegment from "./hull-segment";
import IHullAccount from "./account";
import IHullAccountChanges from "./account-changes";

export default interface IHullAccountUpdateMessage {
  changes?: IHullAccountChanges;
  account_segments: IHullSegment[];
  account: IHullAccount;
  message_id: string;
}
