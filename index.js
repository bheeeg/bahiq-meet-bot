const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const express = require('express');
const cors = require('cors');

// ... باقي الكود

// في داخل createBot، غيّر:
const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),  // ← أضف هذا السطر
  headless: chromium.headless,                      // ← أضف هذا السطر
  args: chromium.args.concat([                      // ← غيّر args
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream'
  ])
});
