import { NextResponse } from "next/server";

// เช็คว่าค่าที่ได้เป็น object อ่าน key
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// แปลงข้อความเป็น JSON ถ้าไม่ได้ก็ให้เป็น raw
function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json(); // ดึงข้อมูลจาก body

    // กำหนด Type ของ body (กันพิมพ์ผิด/กัน undefined)
    const { appId, userId, message, mToken } = body as {
      appId?: string; // ข้อมูลที่จำเป็นต้องมี
      userId?: string; // ข้อมูลที่จำเป็นต้องมี
      message?: string; // ข้อมูลที่จำเป็นต้องมี
      mToken?: string; // ข้อมูลที่จำเป็นต้องมี
    };

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!appId || !userId || !message || !mToken) {
      return NextResponse.json(
        { success: false, message: "Missing appId or userId or message or mToken" },
        { status: 400 }
      );
    }

    // STEP 1: ขอ AccessToken (GDX Authentication)
    // โดยใช้ AgentID = mToken
    const authParams = new URLSearchParams({
      ConsumerSecret: process.env.DGA_CONSUMER_SECRET || "", // ConsumerSecret
      AgentID: mToken, // ใช้ mToken เป็น AgentID
    });

    // สร้าง URL โดยใช้ GDX Authentication URL พร้อม Parameters ก่อนหน้านี้มาประกอบกัน
    const authUrl = `${process.env.GDX_AUTH_URL}?${authParams}`;

    // ทำการเรียก API เพื่อขอ AccessToken ใช้ URL ที่สร้างขึ้น
    const authRes = await fetch(authUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Consumer-Key": process.env.DGA_CONSUMER_KEY || "", // Consumer-Key
      },
    });

    // ดึงผลลัพธ์การตอบกลับจากการขอ AccessToken
    const authText = await authRes.text();

    // เวลาอ่าน field ต้องเช็คว่าเป็น object ก่อน
    const authData: unknown = safeJsonParse(authText);

    // ดึง Result อย่างปลอดภัย (ไม่ใช้ any)
    const accessToken =
      isRecord(authData) && typeof authData.Result === "string" ? authData.Result : null;

    // ตรวจสอบผลลัพธ์การขอ AccessToken
    if (!authRes.ok || !accessToken) {
      return NextResponse.json(
        { success: false, message: "GDX Authentication Failed (notify)", detail: authData },
        { status: 401 }
      );
    }

    // STEP 2: ยิง Notification API จาก URL NOTIFICATION_API_URL
    const url = process.env.NOTIFICATION_API_URL || "";
    if (!url) {
      return NextResponse.json(
        { success: false, message: "Missing NOTIFICATION_API_URL" },
        { status: 500 }
      );
    }

    // กำหนดค่าที่จะส่งไปใน Notification API
    const notifyRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Consumer-Key": process.env.DGA_CONSUMER_KEY || "", // Consumer-Key
        Token: accessToken, // ใช้ AccessToken ที่ได้มาจาก STEP 1
      },
      body: JSON.stringify({
        appId, // AppId
        data: [{ message, userId }], // ส่งข้อมูล notification ในรูปแบบ array
        // sendDateTime: null (ไม่ต้องส่ง = ส่งทันที)
      }),
    });

    // ดึงผลลัพธ์การตอบกลับจาก Notification API
    const notifyText = await notifyRes.text();

    // เวลาอ่าน field ต้องเช็คว่าเป็น object ก่อน
    const notifyData: unknown = safeJsonParse(notifyText);

    // ตรวจสอบผลลัพธ์การส่ง Notification
    const messageCode =
      isRecord(notifyData) && typeof notifyData.messageCode === "number"
        ? notifyData.messageCode
        : undefined;

    const ok = messageCode === 200;

    // ตรวจสอบผลลัพธ์การส่ง notification
    if (!notifyRes.ok || !ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Notification rejected (messageCode=${messageCode})`,
          detail: notifyData,
        },
        { status: 400 }
      );
    }

    // ส่งผลลัพธ์การส่ง Notification กลับไป
    return NextResponse.json({ success: true, result: notifyData });
  } catch (error: unknown) {

    console.error("Notification route error:", error);

    // จับข้อผิดพลาดทั่วไป
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
