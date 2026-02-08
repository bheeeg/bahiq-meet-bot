// config.js - Configuration file for Bahiq Meet Bot

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || 'localhost'
  },

  // Google Sheets Configuration
  googleSheets: {
    spreadsheetId: process.env.SPREADSHEET_ID || 'YOUR_SPREADSHEET_ID_HERE',
    sheetName: process.env.SHEET_NAME || 'Transcripts',
    apiKey: process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE'
  },

  // Google Apps Script Configuration
  googleAppsScript: {
    scriptUrl: process.env.SCRIPT_URL || 'https://script.google.com/macros/d/{SCRIPT_ID}/usercontent'
  },

  // Puppeteer Configuration
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ],
    timeout: 30000
  },

  // Bot Configuration
  bot: {
    defaultName: process.env.BOT_NAME || 'تالي - بوت بهيج',
    autoJoin: true,
    disableAudio: true,
    disableVideo: true,
    enableCaptions: true
  },

  // Debug Configuration
  debug: {
    enabled: process.env.DEBUG_MODE === 'true',
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};