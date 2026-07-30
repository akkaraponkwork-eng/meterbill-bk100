import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ success: false, error: 'No ID' }, { status: 400 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'WaterMeterLogs!A2:E',
    });

    const rows = response.data.values || [];
    
    // Map to array of objects and reverse it so newest is first
    const history = rows.map((row) => ({
      location: row[0] || 'ไม่ระบุ',
      month: row[1] || '',
      prevReading: row[2] || '0',
      currReading: row[3] || '0',
      totalUsage: row[4] || '0',
    })).filter(item => item.month).reverse();

    return NextResponse.json({ success: true, data: history });
  } catch (error: unknown) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ success: false, data: [] });
  }
}
