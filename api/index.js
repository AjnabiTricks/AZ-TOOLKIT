const axios = require('axios');

// ============================================
// APIS
// ============================================
const SIM_API = 'https://famofc.site/api/database.php';
const BOT_TOKEN = process.env.BOT_TOKEN;

// Channel & Links
const CHANNEL_USERNAME = '@AZ_Tricks';
const WHATSAPP_LINK = 'https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D';

// ============================================
// TELEGRAM FUNCTIONS
// ============================================

async function sendMessage(chatId, text, parseMode = 'Markdown') {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    }, { timeout: 5000 });
  } catch (error) {
    console.error('Send message error:', error.message);
  }
}

// ============================================
// CHECK CHANNEL MEMBERSHIP
// ============================================

async function checkChannelMembership(userId) {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`,
      {
        params: {
          chat_id: `@AZ_Tricks`,
          user_id: userId
        },
        timeout: 5000
      }
    );
    
    const status = response.data.result?.status;
    return ['creator', 'administrator', 'member'].includes(status);
  } catch (error) {
    console.error('Channel check error:', error.message);
    return false;
  }
}

// ============================================
// SIM API
// ============================================

async function fetchSimDetails(query) {
  try {
    const response = await axios.get(`${SIM_API}?q=${encodeURIComponent(query)}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    
    const result = response.data;
    console.log('📱 SIM Response:', JSON.stringify(result).substring(0, 300));
    
    if (result && result.success && result.data && result.data.records) {
      return result.data.records;
    }
    return [];
  } catch (error) {
    console.error('SIM Error:', error.message);
    return [];
  }
}

// ============================================
// RENDER SIM RESULTS
// ============================================

function renderSimResults(records, query) {
  // Footer with direct links
  const footer = `
━━━━━━━━━━━━━━━━
📢 *Join our Telegram Channel:* ${CHANNEL_USERNAME}
💬 *Join WhatsApp Channel:* ${WHATSAPP_LINK}`;

  if (!records || records.length === 0) {
    return `❌ *No SIM records found for:* *${query}*\n\n${footer}`;
  }

  let message = `📱 *SIM Details*\n`;
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `🔍 *Search:* *${query}*\n`;
  message += `📊 *Records Found:* ${records.length}\n\n`;

  records.forEach((record, index) => {
    message += `👤 *Name:* ${record.full_name || 'N/A'}\n`;
    message += `📱 *Phone:* ${record.phone || 'N/A'}\n`;
    message += `🪪 *CNIC:* ${record.cnic || 'N/A'}\n`;
    message += `📍 *Address:* ${record.address || 'N/A'}\n`;
    
    if (index < records.length - 1) {
      message += `─────────────────\n\n`;
    }
  });

  message += `\n${footer}`;
  return message;
}

// ============================================
// SEARCH FUNCTION
// ============================================

async function autoSearch(query, chatId, userId) {
  // Check channel membership
  const isMember = await checkChannelMembership(userId);
  
  if (!isMember) {
    await sendMessage(chatId, `
⚠️ *You must join our Telegram Channel first!*

📢 Please join ${CHANNEL_USERNAME} to use this bot.

After joining, send your query again.

━━━━━━━━━━━━━━━━
📢 *Telegram:* ${CHANNEL_USERNAME}
💬 *WhatsApp:* ${WHATSAPP_LINK}

*Powered by:* @AZ_Tricks
    `);
    return;
  }

  // Validate query
  const cleaned = query.replace(/\D/g, '');
  if (cleaned.length !== 11 && cleaned.length !== 13) {
    await sendMessage(chatId, `
❌ *Invalid Format!*

Send:
📱 *Phone:* 03086756345 (11 digits)
🪪 *CNIC:* 3220282538606 (13 digits)

━━━━━━━━━━━━━━━━
📢 *Telegram:* ${CHANNEL_USERNAME}
💬 *WhatsApp:* ${WHATSAPP_LINK}
    `);
    return;
  }

  try {
    const simRecords = await fetchSimDetails(query);
    const message = renderSimResults(simRecords, query);
    await sendMessage(chatId, message);
  } catch (error) {
    console.error('Search Error:', error.message);
    await sendMessage(chatId, `
❌ *Error processing request for:* *${query}*

Please try again later.

━━━━━━━━━━━━━━━━
📢 *Telegram:* ${CHANNEL_USERNAME}
💬 *WhatsApp:* ${WHATSAPP_LINK}
    `);
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'AZ Toolkit Bot is running',
      bot: '@AZToolkitBot',
      credit: 'AZ Tricks'
    });
  }

  if (req.method === 'POST') {
    try {
      const update = req.body;
      
      if (update.message) {
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const text = update.message.text || '';

        // /start command
        if (text === '/start') {
          await sendMessage(chatId, `
👋 *Welcome to AZ Toolkit Bot!*

🔍 *Send me any CNIC or Phone Number!*

📱 *Phone:* 03086756345
🪪 *CNIC:* 3220282538606

⚠️ *You must join ${CHANNEL_USERNAME} to use this bot.*

━━━━━━━━━━━━━━━━
📢 *Telegram:* ${CHANNEL_USERNAME}
💬 *WhatsApp:* ${WHATSAPP_LINK}

*Powered by:* @AZ_Tricks
          `);
          return res.status(200).send('OK');
        }

        // /help command
        if (text === '/help') {
          await sendMessage(chatId, `
📚 *How to Use:*

Send me:
📱 *Phone:* 03086756345
🪪 *CNIC:* 3220282538606

⚠️ *Channel join mandatory:* ${CHANNEL_USERNAME}

━━━━━━━━━━━━━━━━
📢 *Telegram:* ${CHANNEL_USERNAME}
💬 *WhatsApp:* ${WHATSAPP_LINK}

*Powered by:* @AZ_Tricks
          `);
          return res.status(200).send('OK');
        }

        // Unknown commands
        if (text.startsWith('/')) {
          await sendMessage(chatId, `
❌ *Unknown command:* ${text}

Send me a phone number or CNIC directly.

━━━━━━━━━━━━━━━━
📢 *Telegram:* ${CHANNEL_USERNAME}
💬 *WhatsApp:* ${WHATSAPP_LINK}
          `);
          return res.status(200).send('OK');
        }

        // Start search
        await sendMessage(chatId, `⏳ *Searching for:* *${text}* ...`);
        await autoSearch(text, chatId, userId);
      }

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(200).send('OK');
    }
  }

  return res.status(405).send('Method Not Allowed');
};
