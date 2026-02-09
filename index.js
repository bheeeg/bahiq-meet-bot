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
    service: 'بوت بهيج DIY Meet - النسخة المحسّنة',
    version: '3.0.0 VERIFICATION',
    activeBots: activeBots.size
  });
});

// 🔍 دالة فحص محسّنة: هل دخلنا الاجتماع؟
async function isInMeeting(page) {
  try {
    const url = page.url();
    console.log(`🔍 URL الحالي: ${url}`);
    
    // ❌ لو في landing أو waiting → أكيد ما دخلنا
    if (url.includes('/landing') || url.includes('/waiting')) {
      console.log('❌ ما زلنا في صفحة الانتظار');
      return false;
    }
    
    // تحقق من وجود "Ask to join" → معناها ما دخلنا
    const askToJoin = await page.$('span:contains("Ask to join"), span:contains("اطلب الانضمام")');
    if (askToJoin) {
      console.log('❌ ما زال في زر "Ask to join"');
      return false;
    }
    
    // علامات قوية إننا داخل:
    const checks = await page.evaluate(() => {
      // 1. زر "Leave call"
      const leaveBtn = document.querySelector('[aria-label*="Leave call" i], [aria-label*="مغادرة" i]');
      
      // 2. عداد الوقت
      const timer = document.querySelector('[role="timer"]');
      
      // 3. أيقونات التحكم (mic, camera)
      const controlBar = document.querySelector('[data-participant-id], [data-self-name]');
      
      // 4. نص "You're in the meeting"
      const bodyText = document.body.innerText.toLowerCase();
      const inMeeting = bodyText.includes('you\'re in') || bodyText.includes('meeting') && bodyText.includes('participant');
      
      // 5. عدم وجود "Ready to join"
      const readyToJoin = bodyText.includes('ready to join') || bodyText.includes('جاهز للانضمام');
      
      return {
        hasLeaveBtn: !!leaveBtn,
        hasTimer: !!timer,
        hasControlBar: !!controlBar,
        inMeetingText: inMeeting,
        notReady: !readyToJoin,
        bodySnippet: bodyText.substring(0, 200)
      };
    });
    
    console.log('📊 نتائج الفحص:', JSON.stringify(checks, null, 2));
    
    // يجب أن يتحقق شرطين على الأقل
    const score = [
      checks.hasLeaveBtn,
      checks.hasTimer,
      checks.hasControlBar,
      checks.inMeetingText,
      checks.notReady
    ].filter(Boolean).length;
    
    console.log(`📈 نقاط التأكيد: ${score}/5`);
    
    if (score >= 2) {
      console.log('✅ يبدو إننا دخلنا فعلاً!');
      return true;
    }
    
    return false;
    
  } catch (e) {
    console.log('⚠️ خطأ في الفحص:', e.message);
    return false;
  }
}

// 📸 دالة أخذ سكرينشوت
async function takeScreenshot(page, botId) {
  try {
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      type: 'jpeg',
      quality: 60
    });
    return `data:image/jpeg;base64,${screenshot}`;
  } catch (e) {
    console.log('⚠️ فشل السكرينشوت:', e.message);
    return null;
  }
}

// 💣 دالة الهجوم الشامل (محسّنة)
async function bruteForceJoin(page, botName, botId, maxAttempts = 40) {
  console.log('🔥 بدء الهجوم الشامل للدخول...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎯 المحاولة ${attempt}/${maxAttempts}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // تحقق: دخلنا؟
    const joined = await isInMeeting(page);
    if (joined) {
      console.log('✅✅✅ تأكدت 100%: دخلنا الاجتماع! ✅✅✅');
      
      // خذ سكرينشوت للتأكيد
      const screenshot = await takeScreenshot(page, botId);
      
      // حفظ حالة "منتظر التأكيد"
      const bot = activeBots.get(botId);
      if (bot) {
        bot.status = 'waiting_confirmation';
        bot.screenshot = screenshot;
        bot.joinedAt = new Date().toISOString();
      }
      
      return { success: true, screenshot };
    }
    
    try {
      // ═══════════════════════════════════════
      // 🔍 الطريقة 1: البحث عن "Ask to join" تحديداً
      // ═══════════════════════════════════════
      const askButtons = await page.$x("//span[contains(., 'Ask to join') or contains(., 'اطلب')]");
      if (askButtons.length > 0) {
        console.log(`✅ وجدت زر "Ask to join"!`);
        await askButtons[0].click();
        await page.waitForTimeout(4000);
        continue;
      }
      
      // ═══════════════════════════════════════
      // 🔍 الطريقة 2: jsname
      // ═══════════════════════════════════════
      const jsnameBtn = await page.$('span[jsname="V67aGc"]');
      if (jsnameBtn) {
        const text = await jsnameBtn.evaluate(e => e.textContent);
        console.log(`✅ وجدت jsname: "${text}"`);
        await jsnameBtn.click();
        await page.waitForTimeout(3000);
        continue;
      }
      
      // ═══════════════════════════════════════
      // 🔍 الطريقة 3: مسح كل الأزرار
      // ═══════════════════════════════════════
      const allButtons = await page.$$('button, div[role="button"], span[role="button"]');
      console.log(`📊 عدد الأزرار: ${allButtons.length}`);
      
      for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
        try {
          const btn = allButtons[i];
          const text = await btn.evaluate(e => e.textContent?.trim().toLowerCase() || '');
          const ariaLabel = await btn.evaluate(e => e.getAttribute('aria-label')?.toLowerCase() || '');
          
          const combined = text + ' ' + ariaLabel;
          
          const joinWords = ['ask to join', 'join now', 'انضم', 'اطلب', 'دخول'];
          const shouldClick = joinWords.some(w => combined.includes(w));
          
          if (shouldClick && text.length < 50) {
            console.log(`🎯 أضغط على: "${text.substring(0, 40)}"`);
            await btn.click();
            await page.waitForTimeout(3000);
            break;
          }
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════
      // 🔍 الطريقة 4: Enter
      // ═══════════════════════════════════════
      if (attempt % 8 === 0) {
        console.log('⌨️ محاولة Enter...');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
      }
      
      // ═══════════════════════════════════════
      // 🔍 الطريقة 5: JS Injection
      // ═══════════════════════════════════════
      if (attempt % 12 === 0) {
        console.log('💉 JS Injection...');
        await page.evaluate(() => {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const txt = el.textContent?.toLowerCase() || '';
            if ((txt.includes('ask to join') || txt.includes('join now')) && txt.length < 50) {
              el.click();
              break;
            }
          }
        });
        await page.waitForTimeout(3000);
      }
      
    } catch (e) {
      console.log(`⚠️ خطأ: ${e.message}`);
    }
    
    await page.waitForTimeout(3000);
  }
  
  // فشل بعد كل المحاولات → خذ سكرينشوت للتشخيص
  console.log('❌ فشلت كل المحاولات - أخذ سكرينشوت للتشخيص...');
  const screenshot = await takeScreenshot(page, botId);
  
  return { success: false, screenshot };
}

// 🤖 إنشاء البوت
app.post('/bot/create', async (req, res) => {
  try {
    const { meeting_url, bot_name = 'تالي - بوت بهيج' } = req.body;
    
    if (!meeting_url) {
      return res.status(400).json({ error: 'meeting_url مطلوب' });
    }
    
    console.log('\n\n🤖 إنشاء بوت جديد...');
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
    await page.goto(meeting_url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await page.waitForTimeout(5000);
    
    // محاولة إدخال الاسم
    try {
      const nameInput = await page.$('input[type="text"]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type(bot_name, { delay: 80 });
        console.log('✅ أدخلت الاسم');
      }
    } catch (e) {}
    
    await page.waitForTimeout(2000);
    
    // إنشاء البوت مؤقتاً
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
      screenshot: null,
      confirmedByUser: null
    });
    
    // 🔥 الهجوم الشامل!
    const result = await bruteForceJoin(page, bot_name, botId, 40);
    
    const bot = activeBots.get(botId);
    
    if (!result.success) {
      console.log('❌ فشل الدخول بعد كل المحاولات');
      bot.status = 'failed';
      bot.screenshot = result.screenshot;
      
      return res.status(200).json({ 
        success: false,
        bot_id: botId,
        status: 'failed',
        message: 'فشل الدخول التلقائي - تحقق من الصفحة يدوياً',
        screenshot: result.screenshot,
        confirmation_url: `/bot/${botId}/confirm`
      });
    }
    
    console.log('🎉 نجح الدخول (نظرياً)! انتظر التأكيد اليدوي...');
    
    // التقاط النصوص
    await page.exposeFunction('saveTranscript', (text) => {
      if (text && text.length > 2) {
        bot.transcripts.push({
          text: text,
          time: new Date().toLocaleString('ar-SA')
        });
        console.log(`💬 [${bot.transcripts.length}]: ${text}`);
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
    
    res.status(201).json({ 
      success: true,
      bot_id: botId,
      status: 'waiting_confirmation',
      message: '✅ البوت يعتقد إنه دخل - راجع السكرينشوت وأكّد!',
      screenshot: result.screenshot,
      confirmation_url: `/bot/${botId}/confirm`,
      check_url: `/bot/${botId}/status`
    });
    
  } catch (error) {
    console.error('❌ خطأ عام:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ API للتأكيد اليدوي
app.post('/bot/:id/confirm', async (req, res) => {
  const { actually_joined } = req.body; // true or false
  const bot = activeBots.get(req.params.id);
  
  if (!bot) {
    return res.status(404).json({ error: 'البوت غير موجود' });
  }
  
  bot.confirmedByUser = actually_joined;
  
  if (actually_joined === true) {
    bot.status = 'recording';
    console.log(`✅ المستخدم أكّد: البوت ${req.params.id} دخل فعلاً!`);
    res.json({ message: 'تم التأكيد - البوت يسجل الآن!' });
  } else {
    bot.status = 'failed_confirmed';
    console.log(`❌ المستخدم أكّد: البوت ${req.params.id} ما دخل`);
    await bot.browser.close();
    activeBots.delete(req.params.id);
    res.json({ message: 'تم الإلغاء - البوت فشل فعلاً' });
  }
});

// 📊 API لمعرفة حالة البوت
app.get('/bot/:id/status', async (req, res) => {
  const bot = activeBots.get(req.params.id);
  if (!bot) return res.status(404).json({ error: 'غير موجود' });
  
  // خذ سكرينشوت جديد
  const freshScreenshot = await takeScreenshot(bot.page, req.params.id);
  
  res.json({
    bot_id: req.params.id,
    status: bot.status,
    meeting_url: bot.meetingUrl,
    bot_name: bot.botName,
    transcripts_count: bot.transcripts.length,
    confirmed_by_user: bot.confirmedByUser,
    screenshot: freshScreenshot || bot.screenshot,
    current_url: bot.page.url()
  });
});

app.get('/bot/:id/transcripts', (req, res) => {
  const bot = activeBots.get(req.params.id);
  if (!bot) return res.status(404).json({ error: 'البوت غير موجود' });
  res.json({ 
    bot_id: req.params.id,
    transcripts: bot.transcripts, 
    count: bot.transcripts.length,
    status: bot.status
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
    status: b.status,
    transcripts_count: b.transcripts.length,
    confirmed: b.confirmedByUser
  }));
  res.json({ total: bots.length, bots });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀🔥 البوت المحسّن جاهز على بورت:', PORT));
