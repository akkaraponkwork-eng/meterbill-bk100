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

export async function PUT(req: Request) {
  try {
    const { oldName, newName } = await req.json();
    if (!oldName || !newName) return NextResponse.json({ success: false, error: 'Missing names' }, { status: 400 });

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get all locations
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Locations!A:A',
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === oldName.trim());

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
    }

    // Update the specific cell (adding 1 because rows array is 0-indexed and Sheets are 1-indexed)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Locations!A${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newName.trim()]],
      },
    });

    return NextResponse.json({ success: true, message: 'Updated' });
  } catch (error: unknown) {
    console.error('Error updating location:', error);
    return NextResponse.json({ success: false, error: 'Failed to update location' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { location } = await req.json();
    if (!location) return NextResponse.json({ success: false, error: 'Missing location' }, { status: 400 });

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get all locations
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Locations!A:A',
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === location.trim());

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
    }

    // Clear the specific cell
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `Locations!A${rowIndex + 1}`,
    });

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error: unknown) {
    console.error('Error deleting location:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete location' }, { status: 500 });
  }
}
