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
      AgentID: mToken // ใช้ mToken เป็นค่า AgentID //สำหรับทดสอบ process.env.DGA_AGENT_ID || ''
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

    // ส่งข้อมูล User กลับไปให้ Frontend แสดงผล
    return NextResponse.json({
      success: true,
      user: userData.result
    });

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}