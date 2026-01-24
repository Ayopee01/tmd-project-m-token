import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appId, mToken } = body;

    if (!appId || !mToken) {
      return NextResponse.json({ error: 'Missing appId or mToken' }, { status: 400 });
    }

    // --- STEP 3: API GDX Authentication ---
    // สร้างส่วนประกอบของ Params
    const authParams = new URLSearchParams({
      ConsumerSecret: process.env.DGA_CONSUMER_SECRET || '',
      AgentID: mToken // ใช้ mToken เป็นค่า AgentID
    });

    // เรียก API DEPROC เพื่อขอรับ Token ประกอบด้วย Params (ConsumerSecret,AgentID) และ Headers (Consumer-Key)
    const authRes = await fetch(`${process.env.GDX_AUTH_URL}?${authParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Consumer-Key': process.env.DGA_CONSUMER_KEY || '' // Consumer-Key
      }
    });

    // รับผลลัพธ์จากการขอ Token
    const authData = await authRes.json();

    if (!authRes.ok || !authData.Result) {
      console.error('Auth Failed:', authData);
      return NextResponse.json({ error: 'STEP 3 : GDX Authentication Failed' }, { status: 401 });
    }

    // --- STEP 4: Response Token ---
    const accessToken = authData.Result;

    // --- STEP 5: Get User Profile (Deproc API) ---
    const deprocRes = await fetch(process.env.DEPROC_API_URL || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Consumer-Key': process.env.DGA_CONSUMER_KEY || '', // Consumer-Key
        'Token': accessToken // Token ที่ได้จาก STEP 4
      },
      body: JSON.stringify({
        AppId: appId, // AppId
        MToken: mToken // MToken
      }),
    });

    // รับผลลัพธ์จาก Deproc API
    const userData = await deprocRes.json();

    if (!deprocRes.ok) {
      console.error('Deproc Failed:', userData);
      return NextResponse.json({ error: userData.message || 'STEP 5: Failed to fetch user data' }, { status: deprocRes.status });
    }

    // --- STEP 6: Notification Push ---
    async function pushNotification({
      accessToken,
      appId,
      userId,   // CZPUserId ตามคู่มือ
      message,  // ข้อความแจ้งเตือน
    }: {
      accessToken: string;
      appId: string;
      userId: string;
      message: string;
    }) {
      const url = process.env.NOTIFICATION_API_URL || '';
      const consumerKey = process.env.DGA_CONSUMER_KEY || '';

      if (!url) throw new Error('Missing NOTIFICATION_API_URL');
      if (!consumerKey) throw new Error('Missing DGA_CONSUMER_KEY');

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Consumer-Key': consumerKey,
          Token: accessToken, // AccessToken จาก GDX Authentication (STEP 4)
        },
        body: JSON.stringify({
          appId,
          data: [{ message, userId }],
          // ไม่ส่ง sendDateTime = ส่งทันที
        }),
      });

      // กันกรณีปลายทางไม่ตอบ JSON
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        throw new Error(`Notification API failed (${res.status}): ${text.slice(0, 200)}`);
      }

      return data;
    }

    // ✅ เรียกใช้ Notification หลัง login + ได้ profile แล้ว (ส่วนใหม่)
    const profile = userData.result;

    const czpUserId =
      profile?.CZPUserId ?? // กรณี key เป็น CZPUserId
      profile?.CzpUserId ?? // กรณี key เป็น CzpUserId
      null;

    let notification: any = null;
    let notificationError: string | null = null;

    // ส่งแจ้งเตือน “แบบไม่ทำให้ Login ล้ม”
    // (ถ้าต้องการให้ล้มเมื่อแจ้งเตือนล้ม ให้เอา try/catch นี้ออก)
    try {
      if (czpUserId) {
        notification = await pushNotification({
          accessToken,
          appId,
          userId: String(czpUserId),
          message: 'เข้าสู่ระบบสำเร็จ',
        });
      } else {
        notificationError = 'Missing CZPUserId (cannot send notification)';
        console.warn(notificationError);
      }
    } catch (e: any) {
      notificationError = e?.message || 'Notification failed';
      console.error('Notification Failed:', notificationError);
    }

    // ส่งข้อมูล User กลับไปให้ Frontend แสดงผล
    return NextResponse.json({
      success: true,
      user: profile,
      notification,        // ผลลัพธ์จาก Notification API (ถ้าส่งสำเร็จ)
      notificationError,   // เหตุผลกรณีส่งไม่สำเร็จ (ไว้ debug)
    });

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
