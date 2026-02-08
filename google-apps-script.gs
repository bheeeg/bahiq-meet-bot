'use strict';

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Transcripts')
      .addItem('Save Transcript', 'saveTranscript')
      .addToUi();
}

function saveTranscript() {
  var transcript = getTranscript(); // Placeholder function
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([new Date(), transcript]);
  Logger.log('Transcript saved!');
}

function getTranscript() {
  // Implement logic to receive and return the transcript here
  return 'Sample Transcript';
}