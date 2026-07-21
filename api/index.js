const axios = require('axios');

// ============================================
// APIS
// ============================================
const SIM_API = 'https://famofc.site/api/database.php';
const BOT_TOKEN = process.env.BOT_TOKEN;

// Channel username (without @)
const CHANNEL_USERNAME = 'AZ_Tricks';
const WHATSAPP_LINK = 'https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D';

// ============================================
// TELEGRAM FUNCTIONS
// ============================================

async function sendMessage(chatId, text, parseMode = 'Markdown') {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode
    }, { timeout: 5000 });
  } catch (error) {
    console.error('Send message error:', error.message);
  }
}

// ============================================
// CHECK IF USER JOINED CHANNEL
// ============================================

async function checkChannelMembership(userId) {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`,
      {
        params: {
          chat_id: `@${CHANNEL_USERNAME}`,
          user_id: userId
        },
        timeout: 5000
      }
    );
    
    const status = response.data.result?.status;
    // status can be: 'creator', 'administrator', 'member', 'restricted', 'left', 'kicked'
    return status === 'creator' || status === 'administrator' || status === 'member';
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
    console.log('📱 SIM Raw:', JSON.stringify(result));
    
    if (result && result.data && result.data.records) {
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
  if (!records || records.length === 0) {
    return `❌ *No SIM records found for:* *${query}*\n\n━━━━━━━━━━━━━━━━\n\n📢 *Join our channel for more tools:*\n👉 [Join @AZ_Tricks](https://t.me/AZ_Tricks)\n\n💬 *Join WhatsApp Channel:*\n👉 [Join WhatsApp](https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D)`;
  }

  let message = `📱 *SIM Details*\n━━━━━━━━━━━━━━━━\n`;
  message += `🔍 *Search:* *${query}*\n`;
  message += `📊 *Records Found:* ${records.length}\n\n`;

  records.forEach((record, index) => {
    message += `👤 *Name:* ${record.full_name || 'N/A'}\n`;
    message += `📱 *Phone:* ${record.phone || 'N/A'}\n`;
    message += `🪪 *CNIC:* ${record.cnic || 'N/A'}\n`;
    message += `📍 *Address:* ${record.address || 'N/A'}\n`;
    
    // Line between records (except after last)
    if (index < records.length - 1) {
      message += `─────────────────\n\n`;
    }
  });

  message += `\n━━━━━━━━━━━━━━━━\n`;
  message += `📢 *Join our channel for more tools:*\n`;
  message += `👉 [Join @AZ_Tricks](https://t.me/AZ_Tricks)\n\n`;
  message += `💬 *Join WhatsApp Channel:*\n`;
  message += `👉 [Join WhatsApp](https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D)`;

  return message;
}

// ============================================
// SEARCH FUNCTION
// ============================================

async function autoSearch(query, chatId, userId) {
  // Check if user joined channel
  const isMember = await checkChannelMembership(userId);
  
  if (!isMember) {
    await sendMessage(chatId, `
⚠️ *You must join our channel first!*

📢 *Please join @AZ_Tricks to use this bot.*

👉 [Join Channel](https://t.me/AZ_Tricks)

After joining, send your query again.

*Powered by:* @AZ_Tricks
    `);
    return;
  }

  const cleanedQuery = query.replace(/\D/g, '');
  
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

📢 *Join our channel for more tools:*
👉 [Join @AZ_Tricks](https://t.me/AZ_Tricks)

💬 *Join WhatsApp Channel:*
👉 [Join WhatsApp](https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D)
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

        if (text === '/start') {
          await sendMessage(chatId, `
👋 *Welcome to AZ Toolkit Bot!*

🔍 *Send me any CNIC or Phone Number!*

📱 *Phone:* 03086756345
🪪 *CNIC:* 3220282538606

⚠️ *You must join @AZ_Tricks to use this bot.*

━━━━━━━━━━━━━━━━

📢 *Join our channel:* [@AZ_Tricks](https://t.me/AZ_Tricks)
💬 *Join WhatsApp:* [WhatsApp Channel](https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D)

*Powered by:* @AZ_Tricks
          `);
          return res.status(200).send('OK');
        }

        if (text === '/help') {
          await sendMessage(chatId, `
📚 *How to Use:*

Send me:
📱 *Phone:* 03086756345
🪪 *CNIC:* 3220282538606

⚠️ *Channel join mandatory:* @AZ_Tricks

━━━━━━━━━━━━━━━━

📢 *Join channel:* [@AZ_Tricks](https://t.me/AZ_Tricks)
💬 *WhatsApp:* [Join WhatsApp](https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D)

*Powered by:* @AZ_Tricks
          `);
          return res.status(200).send('OK');
        }

        if (text.startsWith('/')) {
          await sendMessage(chatId, `
❌ *Unknown command:* ${text}

Send me a phone number or CNIC directly.

━━━━━━━━━━━━━━━━

📢 *Join @AZ_Tricks for more tools*
          `);
          return res.status(200).send('OK');
        }

        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length !== 11 && cleaned.length !== 13) {
          await sendMessage(chatId, `
❌ *Invalid Format!*

Send:
📱 *Phone:* 03086756345 (11 digits)
🪪 *CNIC:* 3220282538606 (13 digits)

━━━━━━━━━━━━━━━━

📢 *Join @AZ_Tricks for more tools*
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
