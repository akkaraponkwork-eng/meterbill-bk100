import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { location, month, prevReading, currReading, totalUsage } = body; 

    if (!month || prevReading === undefined || currReading === undefined || totalUsage === undefined) {
      return NextResponse.json({ success: false, error: 'Invalid data format. Missing required fields.' }, { status: 400 });
    }

    const loc = location || 'ไม่ระบุสถานที่';

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = 'WaterMeterLogs';

    const valuesToSave = [
      loc,
      month,
      prevReading.toString(),
      currReading.toString(),
      totalUsage.toString(),
    ];

    // 1. Fetch existing data to check for duplicates
    let existingData;
    try {
      existingData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:E`,
      });
    } catch (err: unknown) {
      // If sheet doesn't exist or range is invalid, we will just proceed to append, 
      // but if it's a completely new sheet without the tab, append might also fail.
      // Assuming setup has been run.
      console.warn('Could not fetch existing data, might be a new sheet', err);
    }

    const rows = existingData?.data?.values || [];
    
    // Find if there's an exact match for Location (Col A) and Month (Col B)
    let rowIndexToUpdate = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === loc && row[1] === month) {
        // i is 0-indexed, but Google Sheets ranges are 1-indexed.
        // So row[0] is A1, row[1] is A2, etc.
        rowIndexToUpdate = i + 1;
        break;
      }
    }

    if (rowIndexToUpdate !== -1) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${rowIndexToUpdate}:E${rowIndexToUpdate}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [valuesToSave],
        },
      });
      return NextResponse.json({ success: true, action: 'updated', rowIndex: rowIndexToUpdate });
    } else {
      // Append new row
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [valuesToSave],
        },
      });
      return NextResponse.json({ success: true, action: 'appended', data: response.data });
    }

  } catch (error: unknown) {
    console.error('Error interacting with Google Sheets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
