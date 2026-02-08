const express = require('express');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Configure Google Sheets API
const sheets = google.sheets({ version: 'v4', auth: 'YOUR_GOOGLE_API_KEY' });

// Replace this with your Google Sheets ID
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

// Endpoint to save transcript
app.post('/save-transcript', async (req, res) => {
    const { transcript } = req.body;
    const range = 'Sheet1!A1'; // Change this to your desired range

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: 'RAW',
            resource: {
                values: [[transcript]],
            },
        });
        res.status(200).send('Transcript saved successfully!');
    } catch (error) {
        console.error('Error saving transcript:', error);
        res.status(500).send('Error saving transcript.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
