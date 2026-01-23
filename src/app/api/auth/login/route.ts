// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appId, mToken } = body;

    if (!appId || !mToken) {
      return NextResponse.json({ error: 'Missing appId or mToken' }, { status: 400 });
    }

    // --- STEP 1: Get Access Token (Authentication API) ---
    const authParams = new URLSearchParams({
        ConsumerSecret: process.env.DGA_CONSUMER_SECRET || '',
        AgentID: mToken // เอกสารแนะนำให้ใช้ mToken เป็น AgentID สำหรับ tracking
    });

    const authRes = await fetch(`${process.env.DGA_AUTH_URL}?${authParams}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Consumer-Key': process.env.DGA_CONSUMER_KEY || ''
        }
    });

    const authData = await authRes.json();
    
    if (!authRes.ok || !authData.Result) {
        console.error('Auth Failed:', authData);
        return NextResponse.json({ error: 'DGA Authentication Failed' }, { status: 401 });
    }

    const accessToken = authData.Result; // ได้ Token มาแล้ว

    // --- STEP 2: Get User Profile (Deproc API) ---
    const deprocRes = await fetch(process.env.DGA_DEPROC_URL || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Consumer-Key': process.env.DGA_CONSUMER_KEY || '',
        'Token': accessToken // ใช้ Token ที่ได้จาก Step 1
      },
      body: JSON.stringify({
        AppId: appId,
        MToken: mToken
      }),
    });

    const userData = await deprocRes.json();

    if (!deprocRes.ok) {
        console.error('Deproc Failed:', userData);
        return NextResponse.json({ error: userData.message || 'Failed to fetch user data' }, { status: deprocRes.status });
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