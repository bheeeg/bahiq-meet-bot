const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// تخزين البوتات النشطة
const activeBots = new Map();

// ====================================
// الصفحة الرئيسية (Health Check)
// ====================================
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'بوت بهيج DIY Meet',
    version: '1.0.0',
    activeBots: activeBots.size,
    uptime: Math.floor(process.uptime()) + ' seconds'
  });
});

// ====================================
// إنشاء بوت جديد
// ====================================
app.post('/bot/create', async (req, res) => {
  try {
    const { meeting_url, bot_name = 'تالي - بوت بهيج' } = req.body;
    
    if (!meeting_url) {
      return res.status(400).json({ 
        error: 'meeting_url مطلوب',
        example: { meeting_url: 'https://meet.google.com/xxx-yyyy-zzz' }
      });
    }
    
    console.log('🤖 إنشاء بوت جديد...');
    console.log('📍 الرابط:', meeting_url);
    console.log('👤 الاسم:', bot_name);
    
    // إطلاق المتصفح
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]
    });
    
    const page = await browser.newPage();
    
    // إعطاء صلاحيات
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(meeting_url, ['microphone', 'camera']);
    
    // الذهاب للاجتماع
    console.log('🌐 الدخول للاجتماع...');
    await page.goto(meeting_url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    await page.waitForTimeout(3000);
    
    // إدخال الاسم
    try {
      const nameInput = await page.$('input[placeholder*="name" i], input[placeholder*="اسم" i]');
      if (nameInput) {
        await nameInput.click();
        await nameInput.type(bot_name);
        console.log('✅ تم إدخال الاسم');
      }
    } catch (e) {
      console.log('⚠️ لم يتم العثور على حقل الاسم');
    }
    
    // إيقاف الكاميرا والمايك
    try {
      await page.waitForTimeout(2000);
      
      // البحث عن أزرار الكاميرا والمايك
      const buttons = await page.$$('div[role="button"], button');
      
      for (const button of buttons) {
        const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label') || el.getAttribute('data-tooltip') || '');
        
        if (ariaLabel.match(/camera|كاميرا|turn off|إيقاف/i)) {
          await button.click();
          console.log('📷 تم إيقاف الكاميرا');
          await page.waitForTimeout(500);
        }
        
        if (ariaLabel.match(/microphone|ميكروفون|mute|كتم/i)) {
          await button.click();
          console.log('🎤 تم كتم المايك');
          await page.waitForTimeout(500);
        }
      }
    } catch (e) {
      console.log('⚠️ لم يتم العثور على أزرار الكاميرا/المايك');
    }
    
    // الضغط على "Join" أو "طلب الانضمام"
    try {
      await page.waitForTimeout(2000);
      
      // محاولة النقر على زر Join
      const joinSelectors = [
        'button:has-text("Join now")',
        'button:has-text("Ask to join")',
        'span:has-text("Join")',
        'span:has-text("الانضمام")',
        'div[aria-label*="Join" i]'
      ];
      
      let joined = false;
      for (const selector of joinSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            console.log('✅ تم النقر على زر الانضمام');
            joined = true;
            break;
          }
        } catch (e) {}
      }
      
      if (!joined) {
        // محاولة XPath
        const [button] = await page.$x("//span[contains(text(), 'Join') or contains(text(), 'الانضمام')]");
        if (button) {
          await button.click();
          console.log('✅ تم الانضمام عبر XPath');
        }
      }
    } catch (e) {
      console.log('⚠️ لم يتم العثور على زر الانضمام');
    }
    
    await page.waitForTimeout(5000);
    
    // تفعيل الشرح التلقائي (Captions)
    try {
      await page.waitForTimeout(2000);
      
      // البحث عن زر Captions
      const captionSelectors = [
        'button[aria-label*="captions" i]',
        'button[aria-label*="subtitles" i]',
        'div[aria-label*="captions" i]',
        'button[data-tooltip*="captions" i]'
      ];
      
      for (const selector of captionSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            console.log('✅ تم تفعيل الشرح التلقائي');
            break;
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log('⚠️ لم يتم تفعيل الشرح (قد لا يكون متاحاً)');
    }
    
    // مصفوفة حفظ النصوص
    const transcripts = [];
    
    // مراقبة النصوص
    await page.exposeFunction('saveTranscript', (text, timestamp) => {
      if (text && text.length > 0) {
        transcripts.push({
          text: text,
          timestamp: new Date(timestamp).toISOString(),
          time: new Date(timestamp).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
        });
        console.log(`💬 [${transcripts.length}]: ${text}`);
      }
    });
    
    // مراقبة التغييرات في الصفحة
    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              const text = node.textContent?.trim();
              
              // تجاهل النصوص الفارغة أو الإعلانات
              if (text && 
                  text.length > 2 && 
                  !text.includes('Turn on captions') &&
                  !text.includes('تفعيل الشرح') &&
                  !text.match(/^\d+:\d+$/)) {
                window.saveTranscript(text, Date.now());
              }
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    });
    
    // حفظ معلومات البوت
    const botId = Date.now().toString();
    
    activeBots.set(botId, {
      id: botId,
      browser,
      page,
      transcripts,
      meetingUrl: meeting_url,
      botName: bot_name,
      startTime: new Date(),
      status: 'active'
    });
    
    console.log('✅ البوت جاهز! ID:', botId);
    
    res.status(201).json({
      success: true,
      bot_id: botId,
      status: 'active',
      meeting_url,
      bot_name,
      message: 'البوت يعمل الآن ويسجل النصوص'
    });
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    res.status(500).json({ 
      error: error.message,
      tip: 'تأكد من صحة رابط الاجتماع'
    });
  }
});

// ====================================
// الحصول على النصوص
// ====================================
app.get('/bot/:id/transcripts', (req, res) => {
  const bot = activeBots.get(req.params.id);
  
  if (!bot) {
    return res.status(404).json({ 
      error: 'البوت غير موجود',
      tip: 'تحقق من bot_id'
    });
  }
  
  res.json({
    bot_id: req.params.id,
    transcripts: bot.transcripts,
    count: bot.transcripts.length,
    meeting_url: bot.meetingUrl,
    start_time: bot.startTime,
    status: bot.status
  });
});

// ====================================
// إيقاف البوت
// ====================================
app.delete('/bot/:id', async (req, res) => {
  const bot = activeBots.get(req.params.id);
  
  if (!bot) {
    return res.status(404).json({ error: 'البوت غير موجود' });
  }
  
  try {
    await bot.browser.close();
    activeBots.delete(req.params.id);
    
    console.log('🛑 تم إيقاف البوت:', req.params.id);
    
    res.json({ 
      message: 'تم إيقاف البوت بنجاح',
      transcripts_collected: bot.transcripts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================
// قائمة البوتات النشطة
// ====================================
app.get('/bots', (req, res) => {
  const bots = Array.from(activeBots.values()).map(bot => ({
    id: bot.id,
    meeting_url: bot.meetingUrl,
    bot_name: bot.botName,
    start_time: bot.startTime,
    transcripts_count: bot.transcripts.length,
    status: bot.status
  }));
  
  res.json({
    total: bots.length,
    bots
  });
});

// ====================================
// تشغيل السيرفر
// ====================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('🚀 بوت بهيج DIY Meet يعمل على البورت:', PORT);
  console.log('📍 الاستخدام:');
  console.log('   POST /bot/create - إنشاء بوت');
  console.log('   GET /bot/:id/transcripts - الحصول على النصوص');
  console.log('   DELETE /bot/:id - إيقاف البوت');
  console.log('   GET /bots - قائمة البوتات');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 إيقاف السيرفر...');
  
  for (const [id, bot] of activeBots.entries()) {
    try {
      await bot.browser.close();
      console.log(`✅ تم إغلاق البوت ${id}`);
    } catch (e) {
      console.log(`❌ خطأ في إغلاق البوت ${id}`);
    }
  }
  
  process.exit(0);
});
