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
    service: 'بوت بهيج DIY Meet - النسخة الهاكر',
    version: '2.0.0 AGGRESSIVE',
    activeBots: activeBots.size
  });
});

// 🔥 دالة فحص: هل دخلنا الاجتماع؟
async function isInMeeting(page) {
  try {
    // علامات إننا داخل:
    // 1. وجود أزرار التحكم (leave, mic, camera)
    const leaveButton = await page.$('button[aria-label*="leave" i], button[data-tooltip*="leave" i]');
    if (leaveButton) return true;
    
    // 2. وجود عداد الوقت
    const timer = await page.$('[role="timer"], [data-meeting-timer]');
    if (timer) return true;
    
    // 3. وجود قائمة المشاركين
    const participants = await page.$('[aria-label*="participant" i]');
    if (participants) return true;
    
    // 4. وجود grid الفيديو
    const videoGrid = await page.$('[data-self-name], [data-participant-id]');
    if (videoGrid) return true;
    
    // 5. فحص الـ URL
    const url = page.url();
    if (url.includes('/meet.google.com/') && !url.includes('/landing')) return true;
    
    return false;
  } catch (e) {
    return false;
  }
}

// 💣 دالة "الهجوم الشامل" للدخول
async function bruteForceJoin(page, botName, maxAttempts = 50) {
  console.log('🔥 بدء الهجوم الشامل للدخول...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n🎯 المحاولة ${attempt}/${maxAttempts}`);
    
    // تحقق: دخلنا؟
    const joined = await isInMeeting(page);
    if (joined) {
      console.log('✅✅✅ نجحنا! دخلنا الاجتماع! ✅✅✅');
      return true;
    }
    
    try {
      // ═══════════════════════════════════════
      // 🔍 الطريقة 1: jsname (اللي انت اكتشفته)
      // ═══════════════════════════════════════
      const jsnameSelectors = ['span[jsname="V67aGc"]', 'button[jsname]', 'div[jsname]'];
      
      for (const sel of jsnameSelectors) {
        const elements = await page.$$(sel);
        for (const el of elements) {
          const text = await el.evaluate(e => e.textContent?.toLowerCase() || '');
          if (text.includes('join') || text.includes('انضم') || text.includes('ask')) {
            await el.click();
            console.log(`✅ ضغطت على: ${sel} - "${text}"`);
            await page.waitForTimeout(3000);
            const check = await isInMeeting(page);
            if (check) return true;
          }
        }
      }
      
      // ═══════════════════════════════════════
      // 🔍 الطريقة 2: كل الأزرار والـ divs
      // ═══════════════════════════════════════
      const allClickable = await page.$$('button, div[role="button"], span[role="button"]');
      console.log(`📊 عدد العناصر القابلة للضغط: ${allClickable.length}`);
      
      for (let i = 0; i < allClickable.length; i++) {
        try {
          const el = allClickable[i];
          const text = await el.evaluate(e => e.textContent?.trim().toLowerCase() || '');
          const ariaLabel = await el.evaluate(e => e.getAttribute('aria-label')?.toLowerCase() || '');
          const dataTooltip = await el.evaluate(e => e.getAttribute('data-tooltip')?.toLowerCase() || '');
          
          const combined = text + ' ' + ariaLabel + ' ' + dataTooltip;
          
          // كلمات مفتاحية للدخول
          const keywords = ['join', 'انضم', 'ask to', 'دخول', 'enter', 'continue', 'متابعة'];
          const shouldClick = keywords.some(k => combined.includes(k));
          
          if (shouldClick && text.length < 100) { // تجنب النصوص الطويلة
            console.log(`🎯 [${i}] أحاول: "${text.substring(0, 30)}"`);
            await el.click();
            await page.waitForTimeout(2000);
            
            const check = await isInMeeting(page);
            if (check) return true;
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════
      // 🔍 الطريقة 3: XPath - بحث نصي شامل
      // ═══════════════════════════════════════
      const xpathQueries = [
        "//span[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'join')]",
        "//span[contains(., 'انضم')]",
        "//button[contains(., 'Join')]",
        "//button[contains(., 'Ask')]",
        "//*[contains(text(), 'Join now')]",
        "//*[contains(text(), 'الانضمام')]"
      ];
      
      for (const query of xpathQueries) {
        try {
          const elements = await page.$x(query);
          if (elements.length > 0) {
            console.log(`🔍 وجدت ${elements.length} عنصر بـ XPath: ${query.substring(0, 40)}`);
            await elements[0].click();
            await page.waitForTimeout(2000);
            const check = await isInMeeting(page);
            if (check) return true;
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════
      // 🔍 الطريقة 4: محاولات لوحة المفاتيح
      // ═══════════════════════════════════════
      if (attempt % 5 === 0) { // كل 5 محاولات
        console.log('⌨️ محاولة Enter...');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        const check = await isInMeeting(page);
        if (check) return true;
        
        console.log('⌨️ محاولة Tab + Enter...');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        const check2 = await isInMeeting(page);
        if (check2) return true;
      }
      
      // ═══════════════════════════════════════
      // 🔍 الطريقة 5: Scroll + إعادة تحميل العناصر
      // ═══════════════════════════════════════
      if (attempt % 10 === 0) {
        console.log('📜 محاولة Scroll...');
        await page.evaluate(() => window.scrollBy(0, 200));
        await page.waitForTimeout(1000);
        await page.evaluate(() => window.scrollBy(0, -200));
        await page.waitForTimeout(1000);
      }
      
      // ═══════════════════════════════════════
      // 🔍 الطريقة 6: JavaScript Injection
      // ═══════════════════════════════════════
      if (attempt % 15 === 0) {
        console.log('💉 محاولة JavaScript Injection...');
        await page.evaluate(() => {
          // ابحث عن أي زر يحتوي "join"
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const text = el.textContent?.toLowerCase() || '';
            if ((text.includes('join') || text.includes('انضم')) && text.length < 50) {
              el.click();
              console.log('🎯 Clicked via JS:', text.substring(0, 30));
              break;
            }
          }
        });
        await page.waitForTimeout(3000);
        const check = await isInMeeting(page);
        if (check) return true;
      }
      
    } catch (e) {
      console.log(`⚠️ خطأ في المحاولة ${attempt}:`, e.message);
    }
    
    // انتظر قبل المحاولة التالية
    await page.waitForTimeout(3000);
  }
  
  console.log('❌ فشلت كل المحاولات');
  return false;
}

// 🤖 إنشاء البوت
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
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]),
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(meeting_url, ['microphone', 'camera']);
    
    console.log('🌐 الدخول للصفحة...');
    await page.goto(meeting_url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    await page.waitForTimeout(5000);
    
    // محاولة إدخال الاسم
    try {
      const nameInput = await page.$('input[type="text"]');
      if (nameInput) {
        await nameInput.type(bot_name);
        console.log('✅ أدخلت الاسم');
      }
    } catch (e) {}
    
    await page.waitForTimeout(2000);
    
    // 🔥 الهجوم الشامل!
    const success = await bruteForceJoin(page, bot_name, 50);
    
    if (!success) {
      console.log('❌ فشل الدخول بعد كل المحاولات');
      await browser.close();
      return res.status(500).json({ 
        error: 'فشل الدخول للاجتماع بعد 50 محاولة',
        tip: 'حاول تستخدم رابط مباشر أو تأكد من إعدادات الاجتماع'
      });
    }
    
    console.log('🎉 نجح الدخول! الآن أبدأ التسجيل...');
    
    // التقاط النصوص
    const transcripts = [];
    await page.exposeFunction('saveTranscript', (text) => {
      if (text && text.length > 2) {
        transcripts.push({
          text: text,
          time: new Date().toLocaleString('ar-SA')
        });
        console.log(`💬 [${transcripts.length}]: ${text}`);
      }
    });
    
    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              const txt = node.innerText?.trim();
              if (txt && txt.length > 5 && txt.length < 500) {
                window.saveTranscript(txt);
              }
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    
    const botId = Date.now().toString();
    activeBots.set(botId, { id: botId, browser, page, transcripts, meetingUrl: meeting_url });
    
    console.log('✅ البوت جاهز تماماً! ID:', botId);
    res.status(201).json({ 
      success: true, 
      bot_id: botId,
      message: 'البوت دخل الاجتماع بنجاح ويسجل الآن!'
    });
    
  } catch (error) {
    console.error('❌ خطأ عام:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/bot/:id/transcripts', (req, res) => {
  const bot = activeBots.get(req.params.id);
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });
  res.json({ 
    bot_id: req.params.id,
    transcripts: bot.transcripts, 
    count: bot.transcripts.length,
    meeting_url: bot.meetingUrl
  });
});

app.delete('/bot/:id', async (req, res) => {
  const bot = activeBots.get(req.params.id);
  if (bot) {
    await bot.browser.close();
    activeBots.delete(req.params.id);
    res.json({ message: 'تم إيقاف البوت', transcripts: bot.transcripts.length });
  } else {
    res.status(404).json({ error: 'غير موجود' });
  }
});

app.get('/bots', (req, res) => {
  const bots = Array.from(activeBots.values()).map(b => ({
    id: b.id,
    meeting_url: b.meetingUrl,
    transcripts_count: b.transcripts.length
  }));
  res.json({ total: bots.length, bots });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀🔥 البوت الهاكر جاهز على بورت:', PORT));
