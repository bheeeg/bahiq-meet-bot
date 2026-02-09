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
    version: '1.0.0',
    activeBots: activeBots.size,
    uptime: Math.floor(process.uptime()) + ' seconds'
  });
});

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
    await page.goto(meeting_url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    await page.waitForTimeout(5000);
    
    // إدخال الاسم - محاولات متعددة
    try {
      console.log('✍️ محاولة إدخال الاسم...');
      
      const nameInputSelectors = [
        'input[placeholder*="name" i]',
        'input[placeholder*="اسم" i]',
        'input[aria-label*="name" i]',
        'input[type="text"]',
        'input.VfPpkd-fmcmS-wGMYI'
      ];
      
      let nameEntered = false;
      for (const selector of nameInputSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            await input.click({ clickCount: 3 });
            await page.waitForTimeout(500);
            await input.type(bot_name, { delay: 100 });
            console.log('✅ تم إدخال الاسم بنجاح');
            nameEntered = true;
            break;
          }
        } catch (e) {
          console.log(`⚠️ محاولة ${selector} فشلت`);
        }
      }
      
      if (!nameEntered) {
        console.log('⚠️ لم يتم العثور على حقل الاسم - متابعة...');
      }
      
    } catch (e) {
      console.log('⚠️ خطأ في إدخال الاسم:', e.message);
    }
    
    await page.waitForTimeout(3000);
    
    // إيقاف الكاميرا والمايك - طريقة محدثة
    try {
      console.log('🎥 محاولة إيقاف الكاميرا والمايك...');
      
      // البحث عن جميع الأزرار
      const buttons = await page.$$('div[role="button"], button');
      
      for (const button of buttons) {
        try {
          const ariaLabel = await button.evaluate(el => 
            (el.getAttribute('aria-label') || '').toLowerCase()
          );
          
          const dataTooltip = await button.evaluate(el => 
            (el.getAttribute('data-tooltip') || '').toLowerCase()
          );
          
          const allText = ariaLabel + ' ' + dataTooltip;
          
          // إيقاف الكاميرا
          if (allText.includes('camera') || allText.includes('cam') || 
              allText.includes('video') || allText.includes('turn off')) {
            await button.click();
            console.log('📷 تم إيقاف الكاميرا');
            await page.waitForTimeout(1000);
          }
          
          // كتم المايك
          if (allText.includes('mic') || allText.includes('mute') || 
              allText.includes('audio')) {
            await button.click();
            console.log('🎤 تم كتم المايك');
            await page.waitForTimeout(1000);
          }
        } catch (e) {}
      }
      
    } catch (e) {
      console.log('⚠️ لم يتم إيقاف الكاميرا/المايك:', e.message);
    }
    
    await page.waitForTimeout(3000);
    
    // الدخول للاجتماع - محاولات متعددة
    try {
      console.log('🚪 محاولة الدخول للاجتماع...');
      
      let joined = false;
      
      // الطريقة 1: البحث بالنص المباشر
      const joinTexts = ['Join now', 'Ask to join', 'الانضمام الآن', 'طلب الانضمام'];
      
      for (const text of joinTexts) {
        try {
          const [button] = await page.$x(`//span[contains(text(), '${text}')]`);
          if (button) {
            await button.click();
            console.log(`✅ تم النقر على: ${text}`);
            joined = true;
            break;
          }
        } catch (e) {}
      }
      
      // الطريقة 2: البحث بالـ Selector
      if (!joined) {
        const joinSelectors = [
          'button[data-tooltip*="Join"]',
          'button[aria-label*="Join"]',
          'div[role="button"][aria-label*="Join"]',
          'span.VfPpkd-vQzf8d:has-text("Join")'
        ];
        
        for (const selector of joinSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              await button.click();
              console.log('✅ تم الدخول للاجتماع');
              joined = true;
              break;
            }
          } catch (e) {}
        }
      }
      
      // الطريقة 3: الضغط على أي زر كبير (Last resort)
      if (!joined) {
        const allButtons = await page.$$('button, div[role="button"]');
        for (const btn of allButtons) {
          try {
            const text = await btn.evaluate(el => el.textContent);
            if (text && (text.includes('Join') || text.includes('join') || text.includes('انضمام'))) {
              await btn.click();
              console.log('✅ تم الدخول (طريقة بديلة)');
              joined = true;
              break;
            }
          } catch (e) {}
        }
      }
      
      if (!joined) {
        console.log('⚠️ لم يتم العثور على زر الدخول - قد يكون البوت دخل تلقائياً');
      }
      
    } catch (e) {
      console.log('⚠️ خطأ في الدخول:', e.message);
    }
    
    await page.waitForTimeout(8000);
    
    // تفعيل الترجمة/النصوص
    try {
      console.log('💬 محاولة تفعيل الترجمة...');
      
      const captionSelectors = [
        'button[aria-label*="captions" i]',
        'button[aria-label*="subtitles" i]',
        'button[aria-label*="transcript" i]',
        'button[data-tooltip*="captions" i]',
        'div[aria-label*="captions" i][role="button"]'
      ];
      
      for (const selector of captionSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            console.log('✅ تم تفعيل النصوص');
            break;
          }
        } catch (e) {}
      }
      
    } catch (e) {
      console.log('⚠️ الترجمة غير متاحة');
    }
    
    await page.waitForTimeout(3000);
    
    // التقاط النصوص
    const transcripts = [];
    
    await page.exposeFunction('saveTranscript', (text, timestamp) => {
      if (text && text.length > 2) {
        transcripts.push({
          text: text,
          timestamp: new Date(timestamp).toISOString(),
          time: new Date(timestamp).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
        });
        console.log(`💬 [${transcripts.length}]: ${text}`);
      }
    });
    
    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              const text = node.textContent?.trim();
              
              if (text && 
                  text.length > 2 && 
                  !text.includes('Turn on captions') &&
                  !text.includes('تفعيل') &&
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
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      tip: 'تأكد من صحة رابط الاجتماع'
    });
  }
});

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('🚀 بوت بهيج DIY Meet يعمل على البورت:', PORT);
  console.log('📍 الاستخدام:');
  console.log('   POST /bot/create - إنشاء بوت');
  console.log('   GET /bot/:id/transcripts - الحصول على النصوص');
  console.log('   DELETE /bot/:id - إيقاف البوت');
  console.log('   GET /bots - قائمة البوتات');
});

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
