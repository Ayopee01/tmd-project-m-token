import { NextResponse } from 'next/server';

export async function POST(request: Request) {

  try {
    const body = await request.json(); // ดึงข้อมูลจาก body
    const { appId, userId, message, mToken } = body as { // กำหนด Type ของ body
      appId?: string; // ข้อมูลที่จำเป็นต้องมี
      userId?: string; // ข้อมูลที่จำเป็นต้องมี
      message?: string; // ข้อมูลที่จำเป็นต้องมี
      mToken?: string; // ข้อมูลที่จำเป็นต้องมี
    };

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!appId || !userId || !message || !mToken) {
      return NextResponse.json(
        { success: false, message: 'Missing appId or userId or message or mToken' },
        { status: 400 }
      );
    }

    // STEP 1: ขอ AccessToken (GDX Authentication) 
    // โดยใช้ AgentID = mToken
    const authParams = new URLSearchParams({ // สร้าง URL Parameters โดยประกอบ 2 ค่า
      ConsumerSecret: process.env.DGA_CONSUMER_SECRET || '', // ConsumerSecret
      AgentID: mToken, // ใช้ mToken เป็น AgentID
    });
    // สร้าง URL โดยใช้ GDX Authentication URL พร้อม Parameters ก่อนหน้านี้มาประกอบกัน
    const authUrl = `${process.env.GDX_AUTH_URL}?${authParams}`;

    // ทำการเรียก API เพื่อขอ AccessToken ใช้ URL ที่สร้างขึ้น
    const authRes = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Consumer-Key': process.env.DGA_CONSUMER_KEY || '', // Consumer-Key
      },
    });

    // ดึงผลลัพธ์การตอบกลับจากการขอ AccessToken
    const authText = await authRes.text();
    let authData: any;
    try { authData = JSON.parse(authText); } catch { authData = { raw: authText }; } // แปลงข้อความเป็น JSON

    if (!authRes.ok || !authData?.Result) { // ตรวจสอบผลลัพธ์การขอ AccessToken
      return NextResponse.json( // ถ้าการขอไม่สำเร็จ ส่งกลับข้อผิดพลาด
        { success: false, message: 'GDX Authentication Failed (notify)', detail: authData }, // ข้อความข้อผิดพลาด
        { status: 401 } // สถานะ HTTP 401 Unauthorized
      );
    }

    const accessToken = authData.Result; // ดึง AccessToken จากผลลัพธ์

    // STEP 2: ยิง Notification API จาก URL NOTIFICATION_API_URL
    const url = process.env.NOTIFICATION_API_URL || '';
    if (!url) { // ตรวจสอบว่า URL ถูกตั้งค่าหรือไม่
      return NextResponse.json(
        { success: false, message: 'Missing NOTIFICATION_API_URL' },
        { status: 500 }
      );
    }

    // กำหนดค่าที่จะส่งไปใน Notification API
    const notifyRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Consumer-Key': process.env.DGA_CONSUMER_KEY || '', // Consumer-Key
        Token: accessToken, // ใช้ AccessToken ที่ได้มาจาก STEP 1: GDX Authentication
      },
      body: JSON.stringify({ 
        appId, // AppId
        data: [{ message, userId }], // ส่งข้อมูล notification ในรูปแบบ array
        // sendDateTime: null (ไม่ต้องส่ง = ส่งทันที)
      }),
    });

    // ดึงผลลัพธ์การตอบกลับจาก Notification API
    const notifyText = await notifyRes.text();
    let notifyData: any; // กำหนด Type ของ notifyData
    try { notifyData = JSON.parse(notifyText); } catch { notifyData = { raw: notifyText }; } // แปลงข้อความเป็น JSON

    // ตรวจสอบผลลัพธ์การส่ง Notification
    const messageCode = notifyData?.messageCode;
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
    return NextResponse.json({ success: true, result: notifyData }); // ส่งกลับผลลัพธ์ที่สำเร็จ
  } catch (error: any) {
    ; // จับข้อผิดพลาดทั่วไป
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 }); // ส่งกลับข้อผิดพลาดภายในเซิร์ฟเวอร์
  }
}
