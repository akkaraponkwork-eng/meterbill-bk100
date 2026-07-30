import { google } from 'googleapis';
import { NextResponse } from 'next/server';

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
    
    if (!spreadsheetId) return NextResponse.json({ success: false, error: 'No ID' }, { status: 400 });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Locations!A2:A',
    });

    const rows = response.data.values || [];
    // Flatten array and filter out empty
    const locations = rows.map(r => r[0]).filter(Boolean);

    return NextResponse.json({ success: true, data: locations });
  } catch (error: unknown) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ success: false, data: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { location } = body;
    
    if (!location) {
      return NextResponse.json({ success: false, error: 'Missing location' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // First fetch existing to prevent duplicates
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Locations!A2:A',
    });
    
    const rows = existing.data.values || [];
    const locations = rows.map(r => r[0]).filter(Boolean);
    
    if (locations.includes(location.trim())) {
      return NextResponse.json({ success: true, message: 'Already exists' });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Locations!A:A',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[location.trim()]],
      },
    });

    return NextResponse.json({ success: true, message: 'Added' });
  } catch (error: unknown) {
    console.error('Error adding location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
