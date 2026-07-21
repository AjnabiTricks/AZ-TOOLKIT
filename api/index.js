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
// API FUNCTIONS WITH FALLBACK
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

// ============================================
// 1. SIM API - FASTEST
// ============================================
async function fetchSimDetails(query) {
  try {
    const data = await fetchWithTimeout(`${SIM_API}?q=${encodeURIComponent(query)}`, 8000);
    if (data && data.success && data.data?.records_count > 0) {
      return data.data.records;
    }
    return [];
  } catch (error) {
    console.error('SIM Error:', error.message);
    return [];
  }
}

// ============================================
// 2. LAND API
// ============================================
async function fetchLandRecord(cnic) {
  const clean = cleanCNIC(cnic);
  if (!/^\d{13}$/.test(clean)) return [];
  
  try {
    const data = await fetchWithTimeout(`${LAND_API}?cnic=${clean}`, 10000);
    if (data && data.success && data.data?.length > 0) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('Land Error:', error.message);
    return [];
  }
}

// ============================================
// 3. NURSE API - FIXED
// ============================================
async function fetchNurseRecord(cnic) {
  const clean = cleanCNIC(cnic);
  if (!/^\d{13}$/.test(clean)) return null;
  
  try {
    const data = await fetchWithTimeout(`${NURSE_API}?cnic=${clean}`, 10000);
    if (data && data.success && data.data) {
      // Extract all fields safely
      const info = data.data;
      return {
        info: {
          'Full Name': info['Full Name'] || info['full_name'] || info['name'] || 'N/A',
          'NIC Number': info['NIC Number'] || info['nic_number'] || info['cnic'] || 'N/A',
          'Qualification': info['Qualification'] || info['qualification'] || 'N/A',
          'Speciality': info['Speciality'] || info['speciality'] || 'N/A',
          'Registration Category': info['Registration Category'] || info['registration_category'] || info['category'] || 'N/A',
          'Registration Number': info['Registration Number'] || info['registration_number'] || info['reg_number'] || 'N/A',
          'Initial Registration Date': info['Initial Registration Date'] || info['initial_registration_date'] || info['reg_date'] || 'N/A',
          'License Expiration Date': info['License Expiration Date'] || info['license_expiration_date'] || info['expiry_date'] || 'N/A'
        },
        photo: data.photo || null
      };
    }
    return null;
  } catch (error) {
    console.error('Nurse Error:', error.message);
    return null;
  }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderSimResults(records, query) {
  if (!records || records.length === 0) {
    return `❌ *No SIM records found for:* *${query}*\n\n💡 *Tip:* Try with or without dashes.`;
  }

  let message = `📱 *SIM Details*\n━━━━━━━━━━━━━━━━\n`;
  message += `🔍 *Search:* *${query}*\n`;
  message += `📊 *Records Found:* ${records.length}\n\n`;

  records.forEach((record, index) => {
    message += `👤 *Name:* ${record.full_name || record.name || 'N/A'}\n`;
    message += `📱 *Phone:* ${record.phone || record.mobile || 'N/A'}\n`;
    message += `🪪 *CNIC:* ${record.cnic || record.nic || 'N/A'}\n`;
    message += `📍 *Address:* ${record.address || record.add || 'N/A'}\n`;
    if (index < records.length - 1) {
      message += `─────────────────\n`;
    }
  });

  message += `\n🔗 *Credit:* AZ Tricks (https://t.me/AZ_Tricks)`;
  return message;
}

function renderLandResults(records, query) {
  if (!records || records.length === 0) {
    return `❌ *No Land records found for:* *${query}*`;
  }

  const seen = new Set();
  const unique = records.filter(item => {
    const id = item._source?.Id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  let message = `🏠 *Land Record*\n━━━━━━━━━━━━━━━━\n`;
  message += `🔍 *Search:* *${query}*\n`;
  message += `📊 *Records Found:* ${unique.length}\n\n`;

  unique.forEach((item, index) => {
    const src = item._source || {};
    const parties = src.RegistryParties || [];

    message += `📄 *Registry #${src.Id || 'N/A'}*\n`;
    message += `📅 *Date:* ${src.RegistryDate || 'N/A'}\n`;
    message += `🏷️ *Type:* ${src.RegistryType || 'N/A'}\n`;
    message += `📍 *Mauza:* ${src.MauzaName || 'N/A'}\n`;
    message += `🏛️ *Tehsil:* ${src.Tehsil || 'N/A'}\n`;
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

  message += `\n🔗 *Credit:* AZ Tricks (https://t.me/AZ_Tricks)`;
  return message;
}

function renderNurseResults(data, query) {
  if (!data) {
    return `❌ *No Nurse record found for:* *${query}*`;
  }

  const info = data.info;

  let message = `👩‍⚕️ *Nurse Record*\n━━━━━━━━━━━━━━━━\n`;
  message += `🔍 *Search:* *${query}*\n`;
  message += `👤 *Name:* ${info['Full Name'] || 'N/A'}\n`;
  message += `🪪 *NIC:* ${info['NIC Number'] || 'N/A'}\n`;
  message += `🎓 *Qualification:* ${info['Qualification'] || 'N/A'}\n`;
  message += `🔬 *Speciality:* ${info['Speciality'] || 'N/A'}\n`;
  message += `📋 *Category:* ${info['Registration Category'] || 'N/A'}\n`;
  message += `📄 *Reg. Number:* ${info['Registration Number'] || 'N/A'}\n`;
  message += `📅 *Initial Reg:* ${info['Initial Registration Date'] || 'N/A'}\n`;
  message += `⏳ *Expiry:* ${info['License Expiration Date'] || 'N/A'}\n`;
  message += `\n🔗 *Credit:* AZ Tricks (https://t.me/AZ_Tricks)`;

  return message;
}

// ============================================
// SEARCH FUNCTION - OPTIMIZED
// ============================================

async function autoSearch(query, chatId) {
  const cleanedQuery = query.replace(/\D/g, '');
  
  try {
    // 1. SIM API - Fastest, send first
    const simRecords = await fetchSimDetails(query);
    const simMessage = renderSimResults(simRecords, query);
    await sendMessage(chatId, simMessage);

    // 2. Land & Nurse (if CNIC) - Parallel
    if (cleanedQuery.length === 13) {
      const [landRecords, nurseData] = await Promise.all([
        fetchLandRecord(query),
        fetchNurseRecord(query)
      ]);

      // Land Record
      const landMessage = renderLandResults(landRecords, query);
      await sendMessage(chatId, landMessage);

      // Nurse Record
      if (nurseData) {
        const nurseMessage = renderNurseResults(nurseData, query);
        await sendMessage(chatId, nurseMessage);

        // Send photo separately if available
        if (nurseData.photo) {
          try {
            await sendPhoto(chatId, nurseData.photo, `🆔 *Nurse:* ${nurseData.info['Full Name'] || 'N/A'}`);
          } catch (photoError) {
            console.error('Photo Error:', photoError.message);
            await sendMessage(chatId, `⚠️ *Photo not available for:* *${query}*`);
          }
        }
      } else {
        await sendMessage(chatId, `❌ *No Nurse record found for:* *${query}*`);
      }
    }

    // If only phone number
    if (cleanedQuery.length === 11) {
      await sendMessage(chatId, `ℹ️ *Land Record:* Not applicable for phone number *${query}*`);
      await sendMessage(chatId, `ℹ️ *Nurse Record:* Not applicable for phone number *${query}*`);
    }

  } catch (error) {
    console.error('Search Error:', error.message);
    await sendMessage(chatId, `❌ *Error processing request for:* *${query}*\n\nPlease try again later.`);
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
      credit: 'AZ Tricks',
      webhook_url: 'https://az-toolkit.vercel.app/webhook'
    });
  }

  if (req.method === 'POST') {
    try {
      const update = req.body;
      
      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text || '';

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

        if (text === '/help') {
          await sendMessage(chatId, `
📚 *How to Use:*

Just send me any of these:
📱 *Phone Number:* 03086756345
🪪 *CNIC:* 3440106097263

I'll automatically:
✅ Search SIM details
✅ Search Land Record (if CNIC)
✅ Search Nurse Record (if CNIC)

*Powered by:* @AZ_Tricks
          `);
          return res.status(200).send('OK');
        }

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

        // Start search
        await sendMessage(chatId, `⏳ *Searching for:* *${text}* ...`);
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
