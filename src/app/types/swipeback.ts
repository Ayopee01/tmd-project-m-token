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
};
