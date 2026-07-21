const axios = require('axios');

// ============================================
// APIS
// ============================================
const SIM_API = 'https://famofc.site/api/database.php';
const LAND_API = 'https://az-land-api.vercel.app/api/proxy';
const NURSE_API = 'https://nurse-chi.vercel.app/api/search';

const BOT_TOKEN = process.env.BOT_TOKEN;

// ============================================
// HELPERS
// ============================================

function cleanCNIC(value) {
  return value.replace(/[-\s]/g, '');
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

async function sendPhoto(chatId, photoUrl, caption = '') {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
      parse_mode: 'Markdown'
    }, { timeout: 5000 });
  } catch (error) {
    console.error('Send photo error:', error.message);
  }
}

// ============================================
// API FUNCTIONS WITH TIMEOUT
// ============================================

async function fetchWithTimeout(url, timeout = 8000) {
  try {
    const response = await axios.get(url, {
      timeout: timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.message);
    return null;
  }
}

async function fetchSimDetails(query) {
  const data = await fetchWithTimeout(`${SIM_API}?q=${encodeURIComponent(query)}`, 8000);
  if (data && data.success && data.data?.records_count > 0) {
    return data.data.records;
  }
  return [];
}

async function fetchLandRecord(cnic) {
  const clean = cleanCNIC(cnic);
  if (!/^\d{13}$/.test(clean)) return [];
  
  const data = await fetchWithTimeout(`${LAND_API}?cnic=${clean}`, 8000);
  if (data && data.success && data.data?.length > 0) {
    return data.data;
  }
  return [];
}

async function fetchNurseRecord(cnic) {
  const clean = cleanCNIC(cnic);
  if (!/^\d{13}$/.test(clean)) return null;
  
  const data = await fetchWithTimeout(`${NURSE_API}?cnic=${clean}`, 8000);
  if (data && data.success && data.data) {
    return {
      info: data.data,
      photo: data.photo || null
    };
  }
  return null;
}

// ============================================
// SEARCH FUNCTION
// ============================================

async function autoSearch(query, chatId) {
  const cleanedQuery = query.replace(/\D/g, '');
  let hasResults = false;
  let finalMessage = `🔍 *Search Query:* ${query}\n━━━━━━━━━━━━━━━━\n\n`;

  try {
    // 1. SIM API - Fast
    const simRecords = await fetchSimDetails(query);
    if (simRecords.length > 0) {
      finalMessage += `📱 *SIM Details*\n━━━━━━━━━━━━━━━━\n`;
      finalMessage += `📊 *Records Found:* ${simRecords.length}\n\n`;
      simRecords.forEach((record, index) => {
        finalMessage += `👤 *Name:* ${record.full_name || 'N/A'}\n`;
        finalMessage += `📱 *Phone:* ${record.phone || 'N/A'}\n`;
        finalMessage += `🪪 *CNIC:* ${record.cnic || 'N/A'}\n`;
        finalMessage += `📍 *Address:* ${record.address || 'N/A'}\n`;
        if (index < simRecords.length - 1) {
          finalMessage += `─────────────────\n`;
        }
      });
      finalMessage += `\n━━━━━━━━━━━━━━━━\n\n`;
      hasResults = true;
    }

    // 2. Land & Nurse (if CNIC) - Parallel calls
    if (cleanedQuery.length === 13) {
      const [landRecords, nurseData] = await Promise.all([
        fetchLandRecord(query),
        fetchNurseRecord(query)
      ]);

      // Land Record
      if (landRecords.length > 0) {
        const seen = new Set();
        const unique = landRecords.filter(item => {
          const id = item._source?.Id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        finalMessage += `🏠 *Land Record*\n━━━━━━━━━━━━━━━━\n`;
        finalMessage += `📊 *Records Found:* ${unique.length}\n\n`;

        unique.forEach((item, index) => {
          const src = item._source || {};
          const parties = src.RegistryParties || [];

          finalMessage += `📄 *Registry #${src.Id || 'N/A'}*\n`;
          finalMessage += `📅 *Date:* ${src.RegistryDate || 'N/A'}\n`;
          finalMessage += `🏷️ *Type:* ${src.RegistryType || 'N/A'}\n`;
          finalMessage += `📍 *Mauza:* ${src.MauzaName || 'N/A'}\n`;
          finalMessage += `🏛️ *Tehsil:* ${src.Tehsil || 'N/A'}\n`;
          finalMessage += `💰 *Value:* ${src.RegistryValue ? src.RegistryValue.toLocaleString() : 'N/A'}\n`;

          if (parties.length > 0) {
            finalMessage += `\n👥 *Parties:*\n`;
            parties.forEach(p => {
              const spouse = p.SpouseName ? ` (S/o: ${p.SpouseName})` : '';
              finalMessage += `  • ${p.Name || 'N/A'}${spouse} - ${getRoleLabel(p.RegistryPartiesTypeId)}\n`;
            });
          }

          if (index < unique.length - 1) {
            finalMessage += `─────────────────\n`;
          }
        });

        finalMessage += `\n━━━━━━━━━━━━━━━━\n\n`;
        hasResults = true;
      }

      // Nurse Record
      if (nurseData) {
        const info = nurseData.info;
        finalMessage += `👩‍⚕️ *Nurse Record*\n━━━━━━━━━━━━━━━━\n`;
        finalMessage += `👤 *Name:* ${info['Full Name'] || 'N/A'}\n`;
        finalMessage += `🪪 *NIC:* ${info['NIC Number'] || 'N/A'}\n`;
        finalMessage += `🎓 *Qualification:* ${info['Qualification'] || 'N/A'}\n`;
        finalMessage += `🔬 *Speciality:* ${info['Speciality'] || 'N/A'}\n`;
        finalMessage += `📋 *Category:* ${info['Registration Category'] || 'N/A'}\n`;
        finalMessage += `📄 *Reg. Number:* ${info['Registration Number'] || 'N/A'}\n`;
        finalMessage += `📅 *Initial Reg:* ${info['Initial Registration Date'] || 'N/A'}\n`;
        finalMessage += `⏳ *Expiry:* ${info['License Expiration Date'] || 'N/A'}\n`;
        finalMessage += `\n━━━━━━━━━━━━━━━━\n\n`;
        hasResults = true;

        // Send photo separately
        if (nurseData.photo) {
          await sendPhoto(chatId, nurseData.photo, `🆔 Nurse: ${info['Full Name'] || 'N/A'}`);
        }
      }
    }

    if (!hasResults) {
      await sendMessage(chatId, `❌ No results found for: *${query}*\n\nPlease check the number and try again.`);
      return;
    }

    finalMessage += `🔗 *Credit:* AZ Tricks (https://t.me/AZ_Tricks)`;
    await sendMessage(chatId, finalMessage);

  } catch (error) {
    console.error('Search Error:', error.message);
    await sendMessage(chatId, `❌ Error processing your request. Please try again later.`);
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================

module.exports = async (req, res) => {
  // GET request - health check
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'AZ Toolkit Bot is running',
      bot: '@AZToolkitBot',
      credit: 'AZ Tricks',
      webhook_url: 'https://az-toolkit.vercel.app/webhook'
    });
  }

  // POST request - Telegram updates
  if (req.method === 'POST') {
    try {
      const update = req.body;
      
      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text || '';

        // /start command
        if (text === '/start') {
          await sendMessage(chatId, `
👋 *Welcome to AZ Toolkit Bot!*

🔍 *Just send me any CNIC or Phone Number!*

📱 *Phone:* 03086756345
🪪 *CNIC:* 3440106097263
🪪 *CNIC with dashes:* 34401-0609726-3

I'll auto-detect and search all databases!

*Powered by:* @AZ_Tricks
          `);
          return res.status(200).send('OK');
        }

        // /help command
        if (text === '/help') {
          await sendMessage(chatId, `
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
          `);
          return res.status(200).send('OK');
        }

        // Unknown command
        if (text.startsWith('/')) {
          await sendMessage(chatId, `
❌ *Unknown command: ${text}*

Just send me any CNIC or Phone Number directly!

📱 *Phone:* 03086756345
🪪 *CNIC:* 3440106097263

*Powered by:* @AZ_Tricks
          `);
          return res.status(200).send('OK');
        }

        // Validate input
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length !== 11 && cleaned.length !== 13) {
          await sendMessage(chatId, `
❌ *Invalid Format!*

Please send:
📱 *Phone:* 03086756345 (11 digits)
🪪 *CNIC:* 3440106097263 (13 digits)

*Example:* 3440106097263 or 03086756345

*Powered by:* @AZ_Tricks
          `);
          return res.status(200).send('OK');
        }

        // Send immediate response
        await sendMessage(chatId, '⏳ Searching all databases...');

        // Perform search (async, but we already sent response)
        await autoSearch(text, chatId);
      }

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(200).send('OK');
    }
  }

  return res.status(405).send('Method Not Allowed');
};
