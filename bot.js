const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Environment variables (set in Vercel)
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://az-toolkit.vercel.app';

// APIs
const SIM_API = 'https://famofc.site/api/database.php';
const LAND_API = 'https://az-land-api.vercel.app/api/proxy';
const NURSE_API = 'https://nurse-chi.vercel.app/api/search';

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN);

// Set webhook
bot.setWebHook(`${WEBHOOK_URL}/webhook`);

// Handle webhook requests
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/webhook') {
      const body = req.body;
      await bot.processUpdate(body);
      return res.status(200).send('OK');
    }
    return res.status(200).send('Bot is running!');
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Error');
  }
};

// Bot commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
👋 *Welcome to AZ Toolkit Bot!*

🔍 *Available Commands:*

📱 *Sim Details*
/sim <phone> or /sim <cnic>
Example: /sim 03086756345

🏠 *Land Record*
/land <cnic>
Example: /land 3230437615645

👩‍⚕️ *Nurse Record*
/nurse <cnic>
Example: /nurse 4410307154760

ℹ️ *Help*
/help - Show this message

*Powered by:* @AZ_Tricks
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
📚 *How to Use:*

1️⃣ *Sim Details* - /sim 03086756345
   (Search by Phone or CNIC)

2️⃣ *Land Record* - /land 3230437615645
   (Search by CNIC)

3️⃣ *Nurse Record* - /nurse 4410307154760
   (Search by CNIC)

*Note:* CNIC can be with or without dashes.

*Powered by:* @AZ_Tricks
  `, { parse_mode: 'Markdown' });
});

// ============================================
// 1. SIM DETAILS API (Phone or CNIC)
// ============================================
bot.onText(/\/sim (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1].trim();

  if (!query) {
    return bot.sendMessage(chatId, '❌ Please provide a phone number or CNIC.\nExample: /sim 03086756345');
  }

  const loadingMsg = await bot.sendMessage(chatId, '⏳ Fetching SIM details...');

  try {
    const response = await axios.get(`${SIM_API}?q=${encodeURIComponent(query)}`, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    const result = response.data;

    if (result.success && result.data.records_count > 0) {
      let message = `📱 *SIM Details*\n`;
      message += `━━━━━━━━━━━━━━━━\n`;
      message += `🔍 *Search:* ${query}\n`;
      message += `📊 *Records Found:* ${result.data.records_count}\n\n`;

      result.data.records.forEach((record, index) => {
        message += `👤 *Name:* ${record.full_name || 'N/A'}\n`;
        message += `📱 *Phone:* ${record.phone || 'N/A'}\n`;
        message += `🪪 *CNIC:* ${record.cnic || 'N/A'}\n`;
        message += `📍 *Address:* ${record.address || 'N/A'}\n`;
        if (index < result.data.records_count - 1) {
          message += `─────────────────\n`;
        }
      });

      message += `\n━━━━━━━━━━━━━━━━\n`;
      message += `📡 *Source:* ${result.data.data_source || 'N/A'}\n`;
      message += `🔗 *Credit:* ${result.credit || 'FAMOFC'}\n`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });
    } else {
      await bot.editMessageText(`❌ No records found for: *${query}*`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error('SIM API Error:', error.message);
    await bot.editMessageText(`❌ Error fetching SIM details. Please try again later.\n\nError: ${error.message}`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    });
  }
});

// ============================================
// 2. LAND RECORD API (CNIC)
// ============================================
bot.onText(/\/land (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  let cnic = match[1].trim();

  if (!cnic) {
    return bot.sendMessage(chatId, '❌ Please provide a CNIC.\nExample: /land 3230437615645');
  }

  // Remove dashes
  const cleanCNIC = cnic.replace(/-/g, '');

  if (!/^\d{13}$/.test(cleanCNIC)) {
    return bot.sendMessage(chatId, '❌ Invalid CNIC format. Must be 13 digits.');
  }

  const loadingMsg = await bot.sendMessage(chatId, '⏳ Fetching Land Record...');

  try {
    const response = await axios.get(`${LAND_API}?cnic=${cleanCNIC}`, {
      timeout: 30000
    });

    const result = response.data;

    if (result.success && result.total > 0) {
      let message = `🏠 *Land Record*\n`;
      message += `━━━━━━━━━━━━━━━━\n`;
      message += `🪪 *CNIC:* ${cleanCNIC}\n`;
      message += `📊 *Records Found:* ${result.total}\n\n`;

      result.data.forEach((item, index) => {
        const src = item._source || {};
        const parties = src.RegistryParties || [];

        message += `📄 *Registry #${src.Id || 'N/A'}*\n`;
        message += `📅 *Date:* ${src.RegistryDate || 'N/A'}\n`;
        message += `🏷️ *Type:* ${src.RegistryType || 'N/A'}\n`;
        message += `📍 *Mauza:* ${src.MauzaName || 'N/A'}\n`;
        message += `🏛️ *Tehsil:* ${src.Tehsil || 'N/A'}\n`;
        message += `📋 *Reg. Number:* ${src.RegisteredNumber || 'N/A'}\n`;
        message += `📐 *Area:* ${src.Area || 'N/A'}\n`;
        message += `💰 *Value:* ${src.RegistryValue ? src.RegistryValue.toLocaleString() : 'N/A'}\n`;
        message += `🏠 *Property:* ${src.PropertyNumber || 'N/A'}\n`;

        if (parties.length > 0) {
          message += `\n👥 *Parties:*\n`;
          parties.forEach(p => {
            const role = p.RegistryPartiesTypeId === 1 ? 'Seller' :
                        p.RegistryPartiesTypeId === 2 ? 'Buyer' :
                        p.RegistryPartiesTypeId === 4 ? 'Witness' : 'Party';
            message += `  • ${p.Name || 'N/A'} (${role}) - ${p.CNIC || 'N/A'}\n`;
          });
        }

        if (index < result.data.length - 1) {
          message += `─────────────────\n`;
        }
      });

      message += `\n━━━━━━━━━━━━━━━━\n`;
      message += `🔗 *Credit:* ${result.credit || 'AZ Tricks'}`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });
    } else {
      await bot.editMessageText(`❌ No land records found for CNIC: *${cleanCNIC}*`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error('Land API Error:', error.message);
    await bot.editMessageText(`❌ Error fetching land record. Please try again later.\n\nError: ${error.message}`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    });
  }
});

// ============================================
// 3. NURSE RECORD API (CNIC)
// ============================================
bot.onText(/\/nurse (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  let cnic = match[1].trim();

  if (!cnic) {
    return bot.sendMessage(chatId, '❌ Please provide a CNIC.\nExample: /nurse 4410307154760');
  }

  // Remove dashes
  const cleanCNIC = cnic.replace(/-/g, '');

  if (!/^\d{13}$/.test(cleanCNIC)) {
    return bot.sendMessage(chatId, '❌ Invalid CNIC format. Must be 13 digits.');
  }

  const loadingMsg = await bot.sendMessage(chatId, '⏳ Fetching Nurse Record...');

  try {
    const response = await axios.get(`${NURSE_API}?cnic=${cleanCNIC}`, {
      timeout: 30000
    });

    const result = response.data;

    if (result.success && result.data) {
      const data = result.data;

      let message = `👩‍⚕️ *Nurse Record*\n`;
      message += `━━━━━━━━━━━━━━━━\n`;
      message += `👤 *Name:* ${data['Full Name'] || 'N/A'}\n`;
      message += `🪪 *NIC Number:* ${data['NIC Number'] || 'N/A'}\n`;
      message += `🎓 *Qualification:* ${data['Qualification'] || 'N/A'}\n`;
      message += `🔬 *Speciality:* ${data['Speciality'] || 'N/A'}\n`;
      message += `📋 *Category:* ${data['Registration Category'] || 'N/A'}\n`;
      message += `📄 *Reg. Number:* ${data['Registration Number'] || 'N/A'}\n`;
      message += `📅 *Initial Reg. Date:* ${data['Initial Registration Date'] || 'N/A'}\n`;
      message += `⏳ *License Expiry:* ${data['License Expiration Date'] || 'N/A'}\n`;
      message += `━━━━━━━━━━━━━━━━\n`;

      // Send text message
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

      // Send photo if available
      if (result.photo) {
        try {
          await bot.sendPhoto(chatId, result.photo, {
            caption: `🆔 *${data['Full Name'] || 'Nurse'}* - ${data['Registration Number'] || 'N/A'}`,
            parse_mode: 'Markdown'
          });
        } catch (photoError) {
          console.error('Photo send error:', photoError.message);
          await bot.sendMessage(chatId, '⚠️ Photo not available or failed to load.');
        }
      }

    } else {
      await bot.editMessageText(`❌ No nurse record found for CNIC: *${cleanCNIC}*`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error('Nurse API Error:', error.message);
    await bot.editMessageText(`❌ Error fetching nurse record. Please try again later.\n\nError: ${error.message}`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    });
  }
});

// Handle unknown commands
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (!text.startsWith('/')) {
    bot.sendMessage(chatId, `
❓ *Unknown command*

Use /help to see available commands.

*Powered by:* @AZ_Tricks
    `, { parse_mode: 'Markdown' });
  }
});
