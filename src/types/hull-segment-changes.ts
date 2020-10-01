import IHullSegment from "./hull-segment";

export interface IHullSegmentChanges {
    entered?: IHullSegment[];
    left?: IHullSegment[];
}