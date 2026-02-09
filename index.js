const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const activeBots = new Map();

// 🛠️ Helper: sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🧠 Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini AI جاهز');
} else {
  console.warn('⚠️ GEMINI_API_KEY غير موجود');
}

// 🍪 Cookies
let savedCookies = null;
const BOT_COOKIES = process.env.BOT_COOKIES;

if (BOT_COOKIES) {
  try {
    const rawCookies = JSON.parse(BOT_COOKIES);
    
    // تنظيف الـ Cookies
    savedCookies = rawCookies.map(cookie => {
      let sameSite = cookie.sameSite || 'Lax';
      
      if (sameSite && typeof sameSite === 'string') {
        sameSite = sameSite.charAt(0).toUpperCase() + sameSite.slice(1).toLowerCase();
      }
      
      if (!['Lax', 'Strict', 'None'].includes(sameSite)) {
        sameSite = 'Lax';
      }
      
      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || '.google.com',
        path: cookie.path || '/',
        expires: cookie.expires || cookie.expirationDate || -1,
        httpOnly: cookie.httpOnly === true,
        secure: cookie.secure !== false,
        sameSite: sameSite
      };
    });
    
    console.log('✅ تم تحميل وتنظيف', savedCookies.length, 'cookie');
    
  } catch (e) {
    console.error('❌ فشل تحميل Cookies:', e.message);
  }
}

// 🏠 الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: '🤖 Bahiq AI Agent - Meet Bot',
    version: '6.0.1',
    activeBots: activeBots.size,
    features: {
      hasCookies: !!savedCookies,
      hasGemini: !!genAI,
      cookiesCount: savedCookies ? savedCookies.length : 0
    }
  });
});

// 🧠 تحليل النصوص بـ Gemini
async function analyzeWithGemini(transcripts) {
  if (!genAI || transcripts.length === 0) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const allText = transcripts.map(t => `[${t.time}] ${t.text}`).join('\n');
    
    const prompt = `أنت AI Agent محترف في تحليل الاجتماعات.

نص الاجتماع:
${allText}

اكتب تحليل شامل يحتوي على:
1. **ملخص عام** (3-5 جمل)
2. **النقاط الرئيسية** (قائمة مرقمة)
3. **القرارات المتخذة** (إن وجدت)
4. **المهام والإجراءات** (من سيفعل ماذا)

أرجع النتيجة بصيغة JSON فقط:
{
  "summary": "النص هنا",
  "keyPoints": ["نقطة 1", "نقطة 2"],
  "decisions": ["قرار 1"],
  "actionItems": [{"person": "الاسم", "task": "المهمة"}]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return { summary: response, keyPoints: [], decisions: [], actionItems: [] };
    
  } catch (e) {
    console.error('❌ Gemini error:', e.message);
    return null;
  }
}

// 🔍 تحقق: دخلنا الاجتماع؟
async function isInMeeting(page) {
  try {
    const checks = await page.evaluate(() => {
      const leave = document.querySelector('[aria-label*="Leave" i], [aria-label*="مغادرة" i]');
      const timer = document.querySelector('[role="timer"]');
      const body = document.body.innerText.toLowerCase();
      
      return {
        hasLeave: !!leave,
        hasTimer: !!timer,
        noAsk: !body.includes('ask to join'),
        noReady: !body.includes('ready to join')
      };
    });
    
    const score = Object.values(checks).filter(Boolean).length;
    console.log(`📊 نقاط الدخول: ${score}/4`);
    
    return score >= 2;
  } catch (e) {
    return false;
  }
}

// 🚪 محاولة الدخول
async function attemptJoin(page, maxAttempts = 25) {
  console.log('🚪 بدء محاولات الدخول...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🎯 المحاولة ${attempt}/${maxAttempts}`);
    
    if (await isInMeeting(page)) {
      console.log('✅✅✅ دخلنا الاجتماع! ✅✅✅');
      return true;
    }
    
    try {
      const joinButtons = await page.$x("//span[contains(., 'Join now') or contains(., 'انضم الآن') or contains(., 'Join') or contains(., 'انضم')]");
      
      if (joinButtons.length > 0) {
        console.log('✅ وجدت زر الانضمام');
        await joinButtons[0].click();
        await sleep(4000);
        continue;
      }
      
      const allButtons = await page.$$('button, div[role="button"], span[role="button"]');
      
      for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
        const btn = allButtons[i];
        const text = await btn.evaluate(e => e.textContent?.toLowerCase() || '');
        
        if ((text.includes('join') || text.includes('انضم')) && text.length < 50) {
          console.log(`🎯 محاولة: "${text.substring(0, 30)}"`);
          await btn.click();
          await sleep(3000);
          break;
        }
      }
      
      if (attempt % 6 === 0) {
        console.log('⌨️ محاولة Enter...');
        await page.keyboard.press('Enter');
        await sleep(2000);
      }
      
    } catch (e) {
      console.log(`⚠️ خطأ: ${e.message}`);
    }
    
    await sleep(2500);
  }
  
  console.log('❌ فشلت كل المحاولات');
  return false;
}

// 📸 سكرينشوت
async function takeScreenshot(page) {
  try {
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      type: 'jpeg',
      quality: 50,
      fullPage: false
    });
    return `data:image/jpeg;base64,${screenshot}`;
  } catch (e) {
    console.error('⚠️ فشل السكرينشوت:', e.message);
    return null;
  }
}

// 🤖 إنشاء AI Agent Bot
app.post('/bot/create', async (req, res) => {
  try {
    const { meeting_url, bot_name = 'Tali AI Agent 🤖' } = req.body;
    
    if (!meeting_url) {
      return res.status(400).json({ error: 'meeting_url مطلوب' });
    }
    
    if (!savedCookies) {
      return res.status(400).json({ 
        error: 'Cookies غير موجودة',
        hint: 'أضف BOT_COOKIES في Railway Environment Variables'
      });
    }
    
    console.log('\n\n🤖 ═══════════════════════════════');
    console.log('🤖 إنشاء AI Agent Bot');
    console.log('📍 الرابط:', meeting_url);
    console.log('👤 الاسم:', bot_name);
    console.log('🍪 Cookies:', savedCookies.length);
    console.log('🧠 Gemini:', genAI ? 'متاح ✅' : 'معطل ⚠️');
    console.log('🤖 ═══════════════════════════════\n');
    
    const browser = await puppeteer.launch({
      args: chromium.args.concat([
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-blink-features=AutomationControlled'
      ]),
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(meeting_url, ['microphone', 'camera']);
    
    console.log('🍪 تحميل session...');
    await page.setCookie(...savedCookies);
    
    console.log('🌐 الدخول للصفحة...');
    await page.goto(meeting_url, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(5000);
    
    try {
      const nameInput = await page.$('input[type="text"]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type(bot_name, { delay: 100 });
        console.log('✅ تم إدخال الاسم');
      }
    } catch (e) {}
    
    await sleep(2000);
    
    const botId = Date.now().toString();
    const transcripts = [];
    
    activeBots.set(botId, { 
      id: botId, 
      browser, 
      page, 
      transcripts, 
      meetingUrl: meeting_url,
      botName: bot_name,
      status: 'joining',
      aiAnalysis: null,
      createdAt: new Date().toISOString()
    });
    
    const joined = await attemptJoin(page, 25);
    
    if (!joined) {
      console.log('❌ فشل الدخول');
      const screenshot = await takeScreenshot(page);
      
      activeBots.get(botId).status = 'failed';
      activeBots.get(botId).screenshot = screenshot;
      
      return res.status(200).json({ 
        success: false,
        bot_id: botId,
        message: 'فشل الدخول - قد يحتاج قبول يدوي من المضيف',
        screenshot: screenshot,
        url: page.url()
      });
    }
    
    console.log('🎉 دخل بنجاح! بدء التسجيل الذكي...');
    activeBots.get(botId).status = 'recording';
    activeBots.get(botId).joinedAt = new Date().toISOString();
    
    await page.exposeFunction('saveTranscript', (text) => {
      const bot = activeBots.get(botId);
      if (bot && text && text.length > 2 && text.length < 1000) {
        bot.transcripts.push({ 
          text: text.trim(), 
          time: new Date().toISOString() 
        });
        console.log(`💬 [${bot.transcripts.length}]: ${text.substring(0, 60)}...`);
      }
    });
    
    await page.evaluate(() => {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.innerText) {
              const txt = node.innerText.trim();
              if (txt.length > 5 && txt.length < 500) {
                window.saveTranscript(txt);
              }
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    
    res.status(201).json({ 
      success: true,
      bot_id: botId,
      message: '✅ AI Agent دخل ويسجل الآن!',
      features: {
        recording: true,
        aiAnalysis: !!genAI
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ عام:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// 🧠 تحليل بالذكاء الاصطناعي
app.post('/bot/:id/analyze', async (req, res) => {
  const bot = activeBots.get(req.params.id);
  
  if (!bot) {
    return res.status(404).json({ error: 'البوت غير موجود' });
  }
  
  if (bot.transcripts.length === 0) {
    return res.status(400).json({ error: 'لا توجد نصوص بعد - انتظر قليلاً!' });
  }
  
  console.log('🧠 بدء تحليل Gemini AI...');
  console.log('📊 عدد النصوص:', bot.transcripts.length);
  
  const analysis = await analyzeWithGemini(bot.transcripts);
  
  if (analysis) {
    bot.aiAnalysis = analysis;
    bot.aiAnalysis.analyzedAt = new Date().toISOString();
    console.log('✅ تم التحليل بنجاح!');
  }
  
  res.json({
    success: !!analysis,
    bot_id: req.params.id,
    transcripts_count: bot.transcripts.length,
    analysis: analysis || { error: 'فشل التحليل' }
  });
});

// 📊 جلب النصوص والتحليل
app.get('/bot/:id/transcripts', (req, res) => {
  const bot = activeBots.get(req.params.id);
  
  if (!bot) {
    return res.status(404).json({ error: 'البوت غير موجود' });
  }
  
  res.json({ 
    bot_id: req.params.id,
    status: bot.status,
    transcripts: bot.transcripts, 
    count: bot.transcripts.length,
    aiAnalysis: bot.aiAnalysis,
    meetingUrl: bot.meetingUrl,
    createdAt: bot.createdAt,
    joinedAt: bot.joinedAt || null
  });
});

// 🍪 تحديث Cookies
app.post('/auth/cookies', (req, res) => {
  const { cookies } = req.body;
  
  if (!cookies || !Array.isArray(cookies)) {
    return res.status(400).json({ error: 'cookies يجب أن تكون array' });
  }
  
  savedCookies = cookies;
  console.log('✅ تم تحديث الـ Cookies:', cookies.length);
  
  res.json({ 
    success: true, 
    count: cookies.length,
    message: 'سيتم استخدامها في البوتات القادمة'
  });
});

// ❌ حذف البوت
app.delete('/bot/:id', async (req, res) => {
  const bot = activeBots.get(req.params.id);
  
  if (bot) {
    try {
      await bot.browser.close();
    } catch (e) {
      console.error('⚠️ خطأ في إغلاق المتصفح:', e.message);
    }
    
    activeBots.delete(req.params.id);
    
    console.log(`🗑️ تم حذف البوت: ${req.params.id}`);
    
    res.json({ 
      success: true,
      message: 'تم إيقاف البوت',
      finalStats: {
        transcripts: bot.transcripts.length,
        aiAnalysis: bot.aiAnalysis
      }
    });
  } else {
    res.status(404).json({ error: 'البوت غير موجود' });
  }
});

// 📋 قائمة البوتات
app.get('/bots', (req, res) => {
  const bots = Array.from(activeBots.values()).map(b => ({
    id: b.id,
    status: b.status,
    meeting_url: b.meetingUrl,
    transcripts_count: b.transcripts.length,
    has_analysis: !!b.aiAnalysis,
    created_at: b.createdAt,
    joined_at: b.joinedAt || null
  }));
  
  res.json({ total: bots.length, bots });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('\n🚀🧠 ═══════════════════════════════');
  console.log('🚀 AI Agent Bot جاهز!');
  console.log('🌐 Port:', PORT);
  console.log('🍪 Cookies:', savedCookies ? `${savedCookies.length} loaded ✅` : 'Not loaded ❌');
  console.log('🧠 Gemini AI:', genAI ? 'Ready ✅' : 'Disabled ⚠️');
  console.log('🚀🧠 ═══════════════════════════════\n');
});
