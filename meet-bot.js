//meet-bot.js

function saveTranscriptToSheet(transcript) {
  var sheet = SpreadsheetApp.openById('<YOUR_SPREADSHEET_ID>').getActiveSheet();
  sheet.appendRow([new Date(), transcript]);
}

function onMeetingTranscriptReceived(transcript) {
  saveTranscriptToSheet(transcript);
  // Additional logic for handling the transcript
}

// Example usage: onMeetingTranscriptReceived('This is a sample transcript.');