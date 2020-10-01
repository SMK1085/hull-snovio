import IHullAttributeChanges from "./attribute-changes";
import { IHullSegmentChanges } from "./hull-segment-changes";

export default interface IHullAccountChanges {
  account: IHullAttributeChanges;
  account_segments: IHullSegmentChanges;
  is_new?: boolean;
}
