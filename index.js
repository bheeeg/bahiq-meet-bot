const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const activeBots = new Map();

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'بوت بهيج DIY Meet',
    version: '1.1.0',
    activeBots: activeBots.size,
    uptime: Math.floor(process.uptime()) + ' seconds'
  });
});

app.post('/bot/create', async (req, res) => {
  try {
    const { meeting_url, bot_name = 'تالي - بوت بهيج' } = req.body;
    
    if (!meeting_url) {
      return res.status(400).json({ error: 'meeting_url مطلوب' });
    }
    
    console.log('🤖 إنشاء بوت جديد...');
    console.log('📍 الرابط:', meeting_url);
    console.log('👤 الاسم:', bot_name);
    
    const execPath = await chromium.executablePath();
    
    const browser = await puppeteer.launch({
      args: chromium.args.concat([
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-notifications'
      ]),
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless
    });
    
    const page = await browser.newPage();
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(meeting_url, ['microphone', 'camera']);
    
    console.log('🌐 الدخول للاجتماع...');
    await page.goto(meeting_url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    await page.waitForTimeout(7000);

    // ✍️ إدخال الاسم
    try {
      const nameInput = await page.$('input[type="text"], input[jsname="VfPpkd-fmcmS-wGMYI"]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type(bot_name, { delay: 100 });
        console.log('✅ تم إدخال الاسم');
      }
    } catch (e) { console.log('⚠️ خطأ في الاسم'); }

    await page.waitForTimeout(2000);

    // 🎥 إيقاف الكاميرا والمايك
    try {
      const buttons = await page.$$('div[role="button"], button');
      for (const button of buttons) {
        const label = await button.evaluate(el => (el.getAttribute('aria-label') || '').toLowerCase());
        if (label.includes('camera') || label.includes('microphone') || label.includes('كاميرا') || label.includes('ميكروفون')) {
          await button.click();
          await page.waitForTimeout(500);
        }
      }
      console.log('📷🎤 تم محاولة إغلاق الكاميرا والمايك');
    } catch (e) {}

    await page.waitForTimeout(3000);

    // 🚪 محاولة الدخول (باستخدام الكود اللي انت استخرجته V67aGc)
    console.log('🚪 محاولة النقر على زر الانضمام...');
    let joined = false;

    try {
      // الطريقة 1: استخدام jsname اللي انت وجدته يا أسطورة
      const joinSpan = await page.$('span[jsname="V67aGc"]');
      if (joinSpan) {
        await joinSpan.click();
        console.log('✅ تم النقر على زر الانضمام (V67aGc)');
        joined = true;
      }
    } catch (e) {}

    if (!joined) {
      // الطريقة 2: البحث عن أي نص "انضم" أو "Join"
      const [btn] = await page.$x("//span[contains(., 'انضم') or contains(., 'Join') or contains(., 'Ask')]");
      if (btn) {
        await btn.click();
        console.log('✅ تم النقر على الزر عبر النص');
        joined = true;
      }
    }

    if (!joined) {
      // الطريقة 3: Enter كحل أخير
      await page.keyboard.press('Enter');
      console.log('⌨️ تم ضغط Enter');
    }

    await page.waitForTimeout(10000);

    // 💬 تفعيل الترجمة والتقاط النصوص
    try {
      const capBtn = await page.$('button[aria-label*="captions" i], button[data-tooltip*="captions" i]');
      if (capBtn) await capBtn.click();
    } catch (e) {}

    const transcripts = [];
    await page.exposeFunction('saveTranscript', (text) => {
      if (text && text.length > 2) {
        transcripts.push({
          text: text,
          time: new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
        });
        console.log(`💬 سجلت: ${text}`);
      }
    });

    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.innerText) {
              const txt = node.innerText.trim();
              if (txt.length > 5) window.saveTranscript(txt);
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    const botId = Date.now().toString();
    activeBots.set(botId, { id: botId, browser, page, transcripts });
    
    console.log('✅ البوت جاهز تماماً! ID:', botId);
    res.status(201).json({ success: true, bot_id: botId });

  } catch (error) {
    console.error('❌ فشل:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/bot/:id/transcripts', (req, res) => {
  const bot = activeBots.get(req.params.id);
  if (!bot) return res.status(404).json({ error: 'غير موجود' });
  res.json({ transcripts: bot.transcripts, count: bot.transcripts.length });
});

app.delete('/bot/:id', async (req, res) => {
  const bot = activeBots.get(req.params.id);
  if (bot) {
    await bot.browser.close();
    activeBots.delete(req.params.id);
    res.json({ message: 'تم الإيقاف' });
  } else {
    res.status(404).json({ error: 'غير موجود' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀 السيرفر شغال على بورت:', PORT));
