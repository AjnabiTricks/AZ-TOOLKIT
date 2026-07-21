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
// API FUNCTIONS WITH RAW RESPONSE LOGGING
// ============================================

// 1. SIM API - With full response logging
async function fetchSimDetails(query) {
  try {
    const response = await axios.get(`${SIM_API}?q=${encodeURIComponent(query)}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    
    const data = response.data;
    
    // Send raw response to a specific chat for debugging (optional)
    console.log('📱 SIM Full Response:', JSON.stringify(data));
    
    // Try multiple response structures
    if (data.success) {
      // Structure 1: data.data.records
      if (data.data && data.data.records && Array.isArray(data.data.records)) {
        return data.data.records;
      }
      // Structure 2: data.records
      if (data.records && Array.isArray(data.records)) {
        return data.records;
      }
      // Structure 3: data.data is array
      if (data.data && Array.isArray(data.data)) {
        return data.data;
      }
    }
    
    // Structure 4: data is array
    if (Array.isArray(data)) {
      return data;
    }
    
    console.log('⚠️ No SIM records found in any format');
    return [];
  } catch (error) {
    console.error('SIM Error:', error.message);
    return [];
  }
}

// 2. LAND API - With both with and without dashes
async function fetchLandRecord(cnic) {
  const clean = cleanCNIC(cnic);
  if (!/^\d{13}$/.test(clean)) return [];
  
  try {
    // Try with clean CNIC (without dashes)
    const response1 = await axios.get(`${LAND_API}?cnic=${clean}`, {
      timeout: 15000
    });
    
    let data = response1.data;
    console.log('🏠 Land Response (clean):', JSON.stringify(data).substring(0, 300));
    
    if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data;
    }
    
    // If not found, try with dashes format
    const formattedCNIC = clean.replace(/(\d{5})(\d{7})(\d{1})/, '$1-$2-$3');
    const response2 = await axios.get(`${LAND_API}?cnic=${formattedCNIC}`, {
      timeout: 15000
    });
    
    data = response2.data;
    console.log('🏠 Land Response (with dashes):', JSON.stringify(data).substring(0, 300));
    
    if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data;
    }
    
    console.log('⚠️ No Land records found in any format');
    return [];
  } catch (error) {
    console.error('Land Error:', error.message);
    return [];
  }
}

// 3. NURSE API
async function fetchNurseRecord(cnic) {
  const clean = cleanCNIC(cnic);
  if (!/^\d{13}$/.test(clean)) return null;
  
  try {
    const response = await axios.get(`${NURSE_API}?cnic=${clean}`, {
      timeout: 15000
    });
    
    const data = response.data;
    console.log('👩‍⚕️ Nurse Response:', JSON.stringify(data).substring(0, 300));
    
    if (data.success && data.data) {
      return {
        info: data.data,
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
    return `❌ *No SIM records found for:* *${query}*`;
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
    const id = item._source?.Id || item.Id || item.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  let message = `🏠 *Land Record*\n━━━━━━━━━━━━━━━━\n`;
  message += `🔍 *Search:* *${query}*\n`;
  message += `📊 *Records Found:* ${unique.length}\n\n`;

  unique.forEach((item, index) => {
    const src = item._source || item;
    const parties = src.RegistryParties || [];

    message += `📄 *Registry #${src.Id || src.id || 'N/A'}*\n`;
    message += `📅 *Date:* ${src.RegistryDate || src.registryDate || 'N/A'}\n`;
    message += `🏷️ *Type:* ${src.RegistryType || src.registryType || 'N/A'}\n`;
    message += `📍 *Mauza:* ${src.MauzaName || src.mauzaName || 'N/A'}\n`;
    message += `🏛️ *Tehsil:* ${src.Tehsil || src.tehsil || 'N/A'}\n`;
    message += `💰 *Value:* ${src.RegistryValue ? src.RegistryValue.toLocaleString() : src.registryValue || 'N/A'}\n`;

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
  if (!data || !data.info) {
    return `❌ *No Nurse record found for:* *${query}*`;
  }

  const info = data.info;

  let message = `👩‍⚕️ *Nurse Record*\n━━━━━━━━━━━━━━━━\n`;
  message += `🔍 *Search:* *${query}*\n`;
  message += `👤 *Name:* ${info['Full Name'] || info.full_name || info.name || 'N/A'}\n`;
  message += `🪪 *NIC:* ${info['NIC Number'] || info.nic_number || info.cnic || 'N/A'}\n`;
  message += `🎓 *Qualification:* ${info['Qualification'] || info.qualification || 'N/A'}\n`;
  message += `🔬 *Speciality:* ${info['Speciality'] || info.speciality || 'N/A'}\n`;
  message += `📋 *Category:* ${info['Registration Category'] || info.registration_category || 'N/A'}\n`;
  message += `📄 *Reg. Number:* ${info['Registration Number'] || info.registration_number || 'N/A'}\n`;
  message += `📅 *Initial Reg:* ${info['Initial Registration Date'] || info.initial_registration_date || 'N/A'}\n`;
  message += `⏳ *Expiry:* ${info['License Expiration Date'] || info.license_expiration_date || 'N/A'}\n`;
  message += `\n🔗 *Credit:* AZ Tricks (https://t.me/AZ_Tricks)`;

  return message;
}

// ============================================
// SEARCH FUNCTION
// ============================================

async function autoSearch(query, chatId) {
  const cleanedQuery = query.replace(/\D/g, '');
  
  try {
    // 1. SIM API
    const simRecords = await fetchSimDetails(query);
    const simMessage = renderSimResults(simRecords, query);
    await sendMessage(chatId, simMessage);

    // 2. Land & Nurse (if CNIC)
    if (cleanedQuery.length === 13) {
      const [landRecords, nurseData] = await Promise.all([
        fetchLandRecord(query),
        fetchNurseRecord(query)
      ]);

      const landMessage = renderLandResults(landRecords, query);
      await sendMessage(chatId, landMessage);

      if (nurseData) {
        const nurseMessage = renderNurseResults(nurseData, query);
        await sendMessage(chatId, nurseMessage);

        if (nurseData.photo) {
          try {
            await sendPhoto(chatId, nurseData.photo, `🆔 *Nurse:* ${nurseData.info['Full Name'] || 'N/A'}`);
          } catch (photoError) {
            console.error('Photo Error:', photoError.message);
          }
        }
      } else {
        await sendMessage(chatId, `❌ *No Nurse record found for:* *${query}*`);
      }
    }

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
