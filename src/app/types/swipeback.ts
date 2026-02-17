export type SnapshotItem = { html: string; scrollY: number; ts: number };

export type SwipeBackProps = {
  disabled?: boolean;
  edgePx?: number;        // = gestureResponseDistance.horizontal
  minDistancePx?: number; // ระยะขั้นต่ำถึงจะ back
  targetId?: string;
  backId?: string;
};
