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

    if (!spreadsheetId) {
      return NextResponse.json({ success: false, error: 'GOOGLE_SHEET_ID is missing from environment variables' }, { status: 400 });
    }

    // 1. Get spreadsheet info to check if 'WaterMeterLogs' exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetName = 'WaterMeterLogs';
    const locSheetName = 'Locations';
    
    const sheetExists = spreadsheet.data.sheets?.some(
      (sheet) => sheet.properties?.title === sheetName
    );
    const locSheetExists = spreadsheet.data.sheets?.some(
      (sheet) => sheet.properties?.title === locSheetName
    );

    const requests = [];
    if (!sheetExists) {
      requests.push({
        addSheet: { properties: { title: sheetName } },
      });
    }
    if (!locSheetExists) {
      requests.push({
        addSheet: { properties: { title: locSheetName } },
      });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }

    // 3. Write the headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:E1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['สถานที่', 'เดือน', 'เลขเดือนก่อน', 'เลขเดือนนี้', 'ยอดใช้รวม']],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${locSheetName}!A1:A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['รายชื่อสถานที่']],
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'สร้าง/อัปเดตชีต WaterMeterLogs และ Locations สำเร็จ' 
    });

  } catch (error: unknown) {
    console.error('Error setting up Google Sheets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export const POST = GET;
