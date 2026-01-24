import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const debug: any[] = [];

  try {
    const body = await request.json();
    const { appId, userId, message, mToken } = body as {
      appId?: string;
      userId?: string;
      message?: string;
      mToken?: string;
    };

    debug.push({ step: 'input', ok: true, appId: !!appId, userId: !!userId, message: !!message, mToken: !!mToken });

    if (!appId || !userId || !message || !mToken) {
      debug.push({ step: 'validate', ok: false, error: 'Missing fields' });
      return NextResponse.json(
        { success: false, message: 'Missing appId or userId or message or mToken', debug },
        { status: 400 }
      );
    }

    // STEP 1: GDX Authentication (AgentID = mToken)
    const authParams = new URLSearchParams({
      ConsumerSecret: process.env.DGA_CONSUMER_SECRET || '',
      AgentID: mToken,
    });

    const authUrl = `${process.env.GDX_AUTH_URL}?${authParams}`;
    debug.push({ step: 'auth_request', url: authUrl, hasConsumerKey: !!process.env.DGA_CONSUMER_KEY, hasSecret: !!process.env.DGA_CONSUMER_SECRET });

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

    debug.push({ step: 'auth_response', ok: authRes.ok, status: authRes.status, bodyPreview: authText.slice(0, 200) });

    if (!authRes.ok || !authData?.Result) {
      return NextResponse.json(
        { success: false, message: 'GDX Authentication Failed (notify)', auth: authData, debug },
        { status: 401 }
      );
    }

    const accessToken = authData.Result;

    // STEP 2: Notification Push
    const url = process.env.NOTIFICATION_API_URL || '';
    debug.push({ step: 'notify_request', url, hasUrl: !!url });

    if (!url) {
      return NextResponse.json(
        { success: false, message: 'Missing NOTIFICATION_API_URL', debug },
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
      body: JSON.stringify({ appId, userId, message }),
    });

    const notifyText = await notifyRes.text();
    let notifyData: any;
    try { notifyData = JSON.parse(notifyText); } catch { notifyData = { raw: notifyText }; }

    debug.push({
      step: 'notify_response',
      ok: notifyRes.ok,
      status: notifyRes.status,
      bodyPreview: notifyText.slice(0, 500),
    });

    if (!notifyRes.ok) {
      return NextResponse.json(
        { success: false, message: 'Notification API Failed', detail: notifyData, debug },
        { status: notifyRes.status }
      );
    }

    return NextResponse.json({ success: true, result: notifyData, debug });
  } catch (error: any) {
    debug.push({ step: 'catch', ok: false, error: error?.message || String(error) });
    return NextResponse.json({ success: false, message: 'Internal Server Error', debug }, { status: 500 });
  }
}
