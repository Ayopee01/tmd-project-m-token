export type SwipeBackProps = {
  disabled?: boolean;
  edgePx?: number;
  minDistancePx?: number;
  maxVerticalPx?: number;
  maxTimeMs?: number;

  animDurationMs?: number;
  animEasing?: string;

  targetId?: string; // front layer id
  backId?: string;   // back preview layer id

  backParallaxRatio?: number;     // default 0.3
  backOverlayMaxOpacity?: number; // default 0.12
};

export type SnapshotItem = {
  key: string;     // pathname + search
  html: string;    // snapshot ของ #swipeback-root
  scrollY: number; // เก็บ scroll เดิม
  ts: number;
};
