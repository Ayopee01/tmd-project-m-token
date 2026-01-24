import { NextResponse } from 'next/server';

export async function POST(request: Request) {

  try {
    const body = await request.json();
    const { appId, userId, message, mToken } = body as {
      appId?: string;
      userId?: string;
      message?: string;
      mToken?: string;
    };

    if (!appId || !userId || !message || !mToken) {
      return NextResponse.json(
        { success: false, message: 'Missing appId or userId or message or mToken'},
        { status: 400 }
      );
    }

    // STEP 1: ขอ AccessToken (GDX Authentication) โดยใช้ AgentID = mToken
    const authParams = new URLSearchParams({
      ConsumerSecret: process.env.DGA_CONSUMER_SECRET || '',
      AgentID: mToken,
    });

    const authUrl = `${process.env.GDX_AUTH_URL}?${authParams}`;

    const authRes = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Consumer-Key': process.env.DGA_CONSUMER_KEY || '',
      },
    });

    const authText = await authRes.text();
    let authData: any;
    try { authData = JSON.parse(authText); } catch { authData = { raw: authText }; }

    if (!authRes.ok || !authData?.Result) {
      return NextResponse.json(
        { success: false, message: 'GDX Authentication Failed (notify)', detail: authData },
        { status: 401 }
      );
    }

    const accessToken = authData.Result;

    // STEP 2: ยิง Notification API (ตามคู่มือ: ต้องมี data[])
    const url = process.env.NOTIFICATION_API_URL || '';
    if (!url) {
      return NextResponse.json(
        { success: false, message: 'Missing NOTIFICATION_API_URL' },
        { status: 500 }
      );
    }

    const notifyRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Consumer-Key': process.env.DGA_CONSUMER_KEY || '',
        Token: accessToken,
      },
      body: JSON.stringify({
        appId,
        data: [{ message, userId }], // ✅ FIX: ตามคู่มือ
        // sendDateTime: null (ไม่ต้องส่ง = ส่งทันที)
      }),
    });

    const notifyText = await notifyRes.text();
    let notifyData: any;
    try { notifyData = JSON.parse(notifyText); } catch { notifyData = { raw: notifyText }; }

    // ✅ FIX: เช็ค messageCode ด้วย (API อาจตอบ 200 แต่ messageCode != 200)
    const messageCode = notifyData?.messageCode;
    const okByBiz = messageCode === 200;

    if (!notifyRes.ok || !okByBiz) {
      return NextResponse.json(
        {
          success: false,
          message: `Notification rejected (messageCode=${messageCode})`,
          detail: notifyData,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, result: notifyData });
  } catch (error: any) {;
    return NextResponse.json({ success: false, message: 'Internal Server Error'}, { status: 500 });
  }
}
