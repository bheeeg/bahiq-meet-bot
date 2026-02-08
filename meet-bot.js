// meet-bot.js

/**
 * This Google Apps Script integrates with Google Sheets to save transcripts in real time.
 */

function saveTranscript(transcript) {
  const sheetId = "YOUR_SHEET_ID_HERE"; // Replace with your Google Sheet ID
  const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  const timestamp = new Date().toISOString(); // Get current time

  // Append the transcript along with the timestamp to the spreadsheet
  sheet.appendRow([timestamp, transcript]);
}

// Example usage
function onTranscriptReceived(transcript) {
  saveTranscript(transcript);
}