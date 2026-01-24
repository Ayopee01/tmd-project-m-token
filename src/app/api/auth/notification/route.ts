import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { appId, userId, message } = body as {
            appId?: string;
            userId?: string;
            message?: string;
        };

        if (!appId || !userId || !message) {
            return NextResponse.json(
                { success: false, message: 'Missing appId or userId or message' },
                { status: 400 }
            );
        }

        // ✅ STEP N1: ขอ AccessToken (GDX Authentication) ก่อนยิง Notification
        // หมายเหตุ: endpoint notify ตัวอย่าง "ไม่ส่ง mToken มา" ดังนั้น AgentID ต้องมาจาก env
        // แนะนำใส่ DGA_AGENT_ID ใน .env (เป็นค่า agent สำหรับงาน notify)
        const agentId = process.env.DGA_AGENT_ID || 'notify-agent';

        const authParams = new URLSearchParams({
            ConsumerSecret: process.env.DGA_CONSUMER_SECRET || '',
            AgentID: agentId,
        });

        const authRes = await fetch(`${process.env.GDX_AUTH_URL}?${authParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Consumer-Key': process.env.DGA_CONSUMER_KEY || '',
            },
        });

        const authData = await authRes.json();
        if (!authRes.ok || !authData.Result) {
            console.error('Notify Auth Failed:', authData);
            return NextResponse.json(
                { success: false, message: 'GDX Authentication Failed (notify)' },
                { status: 401 }
            );
        }

        const accessToken = authData.Result;

        // ✅ STEP N2: ยิง Notification API ตามคู่มือ
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
                userId,
                message,
                // ไม่ส่ง sendDateTime = ส่งทันที
            }),
        });

        const text = await notifyRes.text();
        let notifyData: any;
        try { notifyData = JSON.parse(text); } catch { notifyData = { raw: text }; }

        if (!notifyRes.ok) {
            console.error('Notify Failed:', notifyData);
            return NextResponse.json(
                { success: false, message: 'Notification API Failed', detail: notifyData },
                { status: notifyRes.status }
            );
        }

        return NextResponse.json({ success: true, result: notifyData });
    } catch (error) {
        console.error('Notify Server Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
