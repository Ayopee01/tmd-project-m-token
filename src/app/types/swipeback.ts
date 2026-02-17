// src/app/types/swipeback.ts

export type SwipeBackProps = {
    disabled?: boolean;        // เช่น ตอน Drawer เปิดอยู่ให้ปิด gesture
    edgePx?: number;           // ถ้าต้องการให้เริ่มเฉพาะขอบซ้าย (px) | ใส่ -1 = ปัดได้ทั้งจอ (default)
    minDistancePx?: number;    // ระยะปัดขั้นต่ำถึงจะย้อนกลับ
    maxVerticalPx?: number;    // อนุญาตให้เอียงแนวตั้งได้ไม่เกินกี่ px
    maxTimeMs?: number;        // ต้องปัดจบภายในกี่ ms

    animDurationMs?: number;   // ระยะเวลาอนิเมชันตอนสไลด์ออก/กลับ
    animEasing?: string;       // easing ของอนิเมชัน

    targetId?: string;         // id ของ element ที่จะถูก translate (แนะนำให้ครอบทั้งหน้าไว้) เช่น "swipeback-root"
    backId?: string;   // back preview layer id
    stageId?: string;  // stage id

    backParallaxRatio?: number;     // 0..1 (ค่าเริ่ม 0.3)
    backOverlayMaxOpacity?: number; // 0..1 (ค่าเริ่ม 0.12)
};

export type SnapshotItem = {
  key: string;       // pathname+search
  html: string;      // innerHTML ของ #swipeback-root
  scrollY: number;   // scroll ตอน snapshot
  ts: number;
};