const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://az-toolkit.vercel.app';

// APIs
const SIM_API = 'https://famofc.site/api/database.php';
const LAND_API = 'https://az-land-api.vercel.app/api/proxy';
const NURSE_API = 'https://nurse-chi.vercel.app/api/search';

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN);

// ============================================
// WEBHOOK HANDLER
// ============================================
module.exports = async (req, res) => {
  try {
    // Set webhook on first run
    if (req.method === 'GET' && req.url === '/') {
      await bot.setWebHook(`${WEBHOOK_URL}/webhook`);
      return res.status(200).send('Webhook set successfully!');
    }

    // Handle webhook updates
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

// ============================================
// COMMANDS
// ============================================

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
👋 *Welcome to AZ Toolkit Bot!*

🔍 *Just send me any CNIC or Phone Number!*

📱 *Phone:* 03086756345
🪪 *CNIC:* 3440106097263
🪪 *CNIC with dashes:* 34401-0609726-3

I'll auto-detect and search all databases!

*Powered by:* @AZ_Tricks
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
📚 *How to Use:*

Just send me any of these:
📱 *Phone Number:* 03086756345
🪪 *CNIC:* 3440106097263
🪪 *CNIC with dashes:* 34401-0609726-3

I'll automatically:
✅ Search SIM details
✅ Search Land Record (if CNIC)
✅ Search Nurse Record (if CNIC)

*Powered by:* @AZ_Tricks
  `, { parse_mode: 'Markdown' });
});

// ============================================
// HELPERS
// ============================================

function cleanCNIC(value) {
  return value.replace(/[-\s]/g, '');
}

function isPhoneNumber(query) {
  const cleaned = query.replace(/\D/g, '');
  return cleaned.length === 11 && (cleaned.startsWith('03') || cleaned.startsWith('3'));
}

function isCNIC(query) {
  const cleaned = query.replace(/\D/g, '');
  return cleaned.length === 13;
}

function getRoleLabel(typeId) {
  const roles = {
    1: 'Seller',
    2: 'Buyer',
    4: 'Witness',
    31: 'Party'
  };
  return roles[typeId] || `Role ${typeId}`;
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchSimDetails(query) {
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
      return result.data.records;
    }
    return [];
  } catch (error) {
    console.error('SIM API Error:', error.message);
    return [];
  }
}

async function fetchLandRecord(cnic) {
  try {
    const clean = cleanCNIC(cnic);
    if (!/^\d{13}$/.test(clean)) return [];

    const response = await axios.get(`${LAND_API}?cnic=${clean}`, {
      timeout: 30000
    });
    const data = response.data;

    if (data.success && data.data?.length > 0) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('Land API Error:', error.message);
    return [];
  }
}

async function fetchNurseRecord(cnic) {
  try {
    const clean = cleanCNIC(cnic);
    if (!/^\d{13}$/.test(clean)) return null;

    const response = await axios.get(`${NURSE_API}?cnic=${clean}`, {
      timeout: 30000
    });
    const data = response.data;

    if (data.success && data.data) {
      return {
        info: data.data,
        photo: data.photo || null
      };
    }
    return null;
  } catch (error) {
    console.error('Nurse API Error:', error.message);
    return null;
  }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderSimResults(records) {
  if (!records || records.length === 0) return '';

  let message = `📱 *SIM Details*\n━━━━━━━━━━━━━━━━\n`;
  message += `📊 *Records Found:* ${records.length}\n\n`;

  records.forEach((record, index) => {
    message += `👤 *Name:* ${record.full_name || 'N/A'}\n`;
    message += `📱 *Phone:* ${record.phone || 'N/A'}\n`;
    message += `🪪 *CNIC:* ${record.cnic || 'N/A'}\n`;
    message += `📍 *Address:* ${record.address || 'N/A'}\n`;
    if (index < records.length - 1) {
      message += `─────────────────\n`;
    }
  });

  return message;
}

function renderLandResults(records) {
  if (!records || records.length === 0) return '';

  const seen = new Set();
  const unique = records.filter(item => {
    const id = item._source?.Id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  let message = `🏠 *Land Record*\n━━━━━━━━━━━━━━━━\n`;
  message += `📊 *Records Found:* ${unique.length}\n\n`;

  unique.forEach((item, index) => {
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

    if (parties.length > 0) {
      message += `\n👥 *Parties:*\n`;
      parties.forEach(p => {
        const spouse = p.SpouseName ? ` (S/o: ${p.SpouseName})` : '';
        message += `  • ${p.Name || 'N/A'}${spouse} - ${getRoleLabel(p.RegistryPartiesTypeId)}\n`;
      });
    }

    if (index < unique.length - 1) {
      message += `─────────────────\n`;
    }
  });

  return message;
}

function renderNurseResults(data) {
  if (!data) return '';

  const info = data.info;

  let message = `👩‍⚕️ *Nurse Record*\n━━━━━━━━━━━━━━━━\n`;
  message += `👤 *Name:* ${info['Full Name'] || 'N/A'}\n`;
  message += `🪪 *NIC:* ${info['NIC Number'] || 'N/A'}\n`;
  message += `🎓 *Qualification:* ${info['Qualification'] || 'N/A'}\n`;
  message += `🔬 *Speciality:* ${info['Speciality'] || 'N/A'}\n`;
  message += `📋 *Category:* ${info['Registration Category'] || 'N/A'}\n`;
  message += `📄 *Reg. Number:* ${info['Registration Number'] || 'N/A'}\n`;
  message += `📅 *Initial Reg:* ${info['Initial Registration Date'] || 'N/A'}\n`;
  message += `⏳ *Expiry:* ${info['License Expiration Date'] || 'N/A'}\n`;

  return message;
}

// ============================================
// MAIN SEARCH
// ============================================

async function autoSearch(query, chatId, loadingMsg) {
  const cleanedQuery = query.replace(/\D/g, '');
  let hasResults = false;
  let finalMessage = `🔍 *Search Query:* ${query}\n━━━━━━━━━━━━━━━━\n\n`;

  try {
    const simRecords = await fetchSimDetails(query);
    if (simRecords.length > 0) {
      finalMessage += renderSimResults(simRecords);
      finalMessage += `\n━━━━━━━━━━━━━━━━\n\n`;
      hasResults = true;
    }

    if (cleanedQuery.length === 13) {
      const landRecords = await fetchLandRecord(query);
      if (landRecords.length > 0) {
        finalMessage += renderLandResults(landRecords);
        finalMessage += `\n━━━━━━━━━━━━━━━━\n\n`;
        hasResults = true;
      }

      const nurseData = await fetchNurseRecord(query);
      if (nurseData) {
        finalMessage += renderNurseResults(nurseData);
        finalMessage += `\n━━━━━━━━━━━━━━━━\n\n`;
        hasResults = true;

        if (nurseData.photo) {
          try {
            await bot.sendPhoto(chatId, nurseData.photo, {
              caption: `🆔 Nurse: ${nurseData.info['Full Name'] || 'N/A'}`
            });
          } catch (photoError) {
            console.error('Photo Error:', photoError.message);
          }
        }
      }
    }

    if (!hasResults) {
      await bot.editMessageText(`❌ No results found for: *${query}*\n\nPlease check the number and try again.`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });
      return;
    }

    finalMessage = finalMessage.trim();
    finalMessage += `\n🔗 *Credit:* AZ Tricks (https://t.me/AZ_Tricks)`;

    await bot.editMessageText(finalMessage, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error('Search Error:', error.message);
    await bot.editMessageText(`❌ Error processing your request. Please try again later.\n\nError: ${error.message}`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    });
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (text.startsWith('/')) return;
  if (!text.trim()) return;

  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length !== 11 && cleaned.length !== 13) {
    return bot.sendMessage(chatId, `
❌ *Invalid Format!*

Please send:
📱 *Phone:* 03086756345 (11 digits)
🪪 *CNIC:* 3440106097263 (13 digits)

*Example:* 3440106097263 or 03086756345

*Powered by:* @AZ_Tricks
    `, { parse_mode: 'Markdown' });
  }

  const loadingMsg = await bot.sendMessage(chatId, '⏳ Searching all databases...');
  await autoSearch(text, chatId, loadingMsg);
});

bot.onText(/\/.+/, (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (!['/start', '/help'].includes(text)) {
    bot.sendMessage(chatId, `
❌ *Unknown command: ${text}*

Just send me any CNIC or Phone Number directly!

📱 *Phone:* 03086756345
🪪 *CNIC:* 3440106097263

*Powered by:* @AZ_Tricks
    `, { parse_mode: 'Markdown' });
  }
});
