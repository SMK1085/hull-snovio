export default interface IHullSegment {
  id: string;
  name: string;
  type: string;
  stats?: {
    users?: number;
    accounts?: number;
  };
  created_at: string;
  updated_at: string;
}
