const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Your bot token from environment variable
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);

// Helper function to format phone number
function formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    if (!cleaned.startsWith('92')) {
        cleaned = '92' + cleaned;
    }
    return cleaned;
}

// Helper function to format CNIC
function formatCNIC(cnic) {
    return cnic.replace(/-/g, '');
}

// Function to fetch SIM details
async function fetchSimDetails(query) {
    try {
        const url = `https://famofc.site/api/database.php?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error('Error fetching SIM details:', error);
        return null;
    }
}

// Function to fetch property details
async function fetchPropertyDetails(cnic) {
    try {
        const url = `https://az-land-api.vercel.app/api/proxy?cnic=${encodeURIComponent(cnic)}`;
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error('Error fetching property details:', error);
        return null;
    }
}

// Function to fetch nurse details
async function fetchNurseDetails(cnic) {
    try {
        const url = `https://nurse-chi.vercel.app/api/search?cnic=${encodeURIComponent(cnic)}`;
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error('Error fetching nurse details:', error);
        return null;
    }
}

// Main message handler
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (!text) return;

    // Handle /start command
    if (text === '/start') {
        const welcomeMessage = `
🔍 *Welcome to Search Bot!*

Simply send me:
📱 *Phone Number* (e.g., 03086756345)
🆔 *CNIC Number* (e.g., 3220282538606)

I will automatically search for:
✅ SIM Details
✅ Property Records
✅ Nurse Registration

*Just type your phone number or CNIC and send!*
        `;
        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        return;
    }

    // Clean the input
    const cleaned = text.replace(/\s/g, '');
    
    // Check if it's a phone number (11-13 digits, starts with 0 or 92)
    const isPhone = /^(0|92)[0-9]{10,12}$/.test(cleaned);
    
    if (isPhone) {
        // Search by phone - only SIM details
        const formattedQuery = formatPhoneNumber(cleaned);
        const result = await fetchSimDetails(formattedQuery);
        
        if (!result || !result.success || !result.data.records || result.data.records.length === 0) {
            await bot.sendMessage(chatId, '❌ No SIM records found for this phone number.');
            return;
        }
        
        const data = result.data;
        const records = data.records;
        
        let message = `📊 *SIM Details (Phone Search)*\n`;
        message += `📱 Phone: ${data.input_query || cleaned}\n`;
        message += `📝 Records Found: ${records.length}\n\n`;
        
        for (let i = 0; i < Math.min(records.length, 10); i++) {
            const record = records[i];
            message += `*Record ${i + 1}:*\n`;
            message += `👤 Name: ${record.full_name || 'N/A'}\n`;
            message += `📱 Phone: ${record.phone || 'N/A'}\n`;
            message += `🆔 CNIC: ${record.cnic || 'N/A'}\n`;
            message += `📍 Address: ${record.address || 'N/A'}\n\n`;
        }
        
        if (records.length > 10) {
            message += `\n_Showing first 10 of ${records.length} records_`;
        }
        
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        return;
    }

    // Check if it's a CNIC (13 digits, possibly with dashes)
    const cnicCleaned = cleaned.replace(/-/g, '');
    if (/^[0-9]{13}$/.test(cnicCleaned)) {
        let found = false;
        let combinedMessage = `🔍 *Search Results for CNIC: ${cnicCleaned}*\n\n`;
        
        // 1. Try SIM details
        const simResult = await fetchSimDetails(cnicCleaned);
        if (simResult && simResult.success && simResult.data.records && simResult.data.records.length > 0) {
            found = true;
            const data = simResult.data;
            const records = data.records;
            
            combinedMessage += `📱 *SIM Details*\n`;
            combinedMessage += `📝 Records Found: ${records.length}\n\n`;
            
            for (let i = 0; i < Math.min(records.length, 5); i++) {
                const record = records[i];
                combinedMessage += `*Record ${i + 1}:*\n`;
                combinedMessage += `👤 Name: ${record.full_name || 'N/A'}\n`;
                combinedMessage += `📱 Phone: ${record.phone || 'N/A'}\n`;
                combinedMessage += `📍 Address: ${record.address || 'N/A'}\n\n`;
            }
            
            if (records.length > 5) {
                combinedMessage += `_Showing first 5 of ${records.length} records_\n\n`;
            }
        }
        
        // 2. Try property records
        const propResult = await fetchPropertyDetails(cnicCleaned);
        if (propResult && propResult.success && propResult.total > 0) {
            found = true;
            const data = propResult.data[0];
            if (data && data._source) {
                const source = data._source;
                const parties = source.RegistryParties || [];
                
                combinedMessage += `🏠 *Property Record*\n`;
                combinedMessage += `📋 Registry Number: ${source.RegisteredNumber || 'N/A'}\n`;
                combinedMessage += `🏢 Property: ${source.PropertyNumber || 'N/A'}\n`;
                combinedMessage += `📍 Mauza: ${source.MauzaName || 'N/A'}\n`;
                combinedMessage += `🏘️ Tehsil: ${source.Tehsil || 'N/A'}\n`;
                combinedMessage += `📅 Registry Date: ${source.RegistryDate || 'N/A'}\n`;
                combinedMessage += `💰 Value: ${source.RegistryValue ? `PKR ${source.RegistryValue.toLocaleString()}` : 'N/A'}\n`;
                combinedMessage += `📐 Area: ${source.Area || 'N/A'}\n`;
                combinedMessage += `📝 Type: ${source.RegistryType || 'N/A'}\n\n`;
                combinedMessage += `👥 *Parties Involved:*\n`;
                
                for (let i = 0; i < Math.min(parties.length, 3); i++) {
                    const party = parties[i];
                    const partyType = party.RegistryPartiesTypeId === 31 ? 'Witness' : 
                                     party.RegistryPartiesTypeId === 2 ? 'Seller' : 'Buyer';
                    combinedMessage += `\n*${partyType} ${i + 1}:*\n`;
                    combinedMessage += `👤 Name: ${party.Name || 'N/A'}\n`;
                    combinedMessage += `🆔 CNIC: ${party.CNIC || 'N/A'}\n`;
                }
                combinedMessage += `\n`;
            }
        }
        
        // 3. Try nurse records
        const nurseResult = await fetchNurseDetails(cnicCleaned);
        if (nurseResult && nurseResult.success) {
            found = true;
            const data = nurseResult.data;
            const photoUrl = nurseResult.photo;
            
            combinedMessage += `👩‍⚕️ *Nurse Registration Details*\n`;
            combinedMessage += `👤 Name: ${data['Full Name'] || 'N/A'}\n`;
            combinedMessage += `🆔 NIC Number: ${data['NIC Number'] || 'N/A'}\n`;
            combinedMessage += `🎓 Qualification: ${data['Qualification'] || 'N/A'}\n`;
            combinedMessage += `🔬 Speciality: ${data['Speciality'] || 'N/A'}\n`;
            combinedMessage += `📋 Registration Category: ${data['Registration Category'] || 'N/A'}\n`;
            combinedMessage += `🔢 Registration Number: ${data['Registration Number'] || 'N/A'}\n`;
            combinedMessage += `📅 Initial Registration: ${data['Initial Registration Date'] || 'N/A'}\n`;
            combinedMessage += `⏳ License Expiry: ${data['License Expiration Date'] || 'N/A'}\n\n`;
            
            // Send text message first
            await bot.sendMessage(chatId, combinedMessage, { parse_mode: 'Markdown' });
            
            // Send photo if available
            if (photoUrl) {
                try {
                    await bot.sendPhoto(chatId, photoUrl, {
                        caption: '📸 *Photo of the nurse*',
                        parse_mode: 'Markdown'
                    });
                } catch (error) {
                    console.error('Error sending photo:', error);
                }
            }
            return;
        }
        
        // If no records found in any service
        if (!found) {
            await bot.sendMessage(chatId, '❌ No records found for this CNIC in any database.');
            return;
        }
        
        // Send combined message for SIM and Property (if nurse wasn't found)
        if (found && combinedMessage) {
            await bot.sendMessage(chatId, combinedMessage, { parse_mode: 'Markdown' });
        }
        return;
    }
    
    // Invalid input
    await bot.sendMessage(chatId, '❌ Invalid input. Please send a valid:\n📱 Phone number (e.g., 03086756345)\n🆔 CNIC number (e.g., 3220282538606)');
}

// Vercel serverless function handler
module.exports = async (req, res) => {
    try {
        const { body } = req;
        
        if (body && body.message) {
            await handleMessage(body.message);
            res.status(200).send('OK');
        } else {
            // Set webhook if not already set (for first time setup)
            const webhookUrl = `https://${req.headers.host}/api/bot`;
            try {
                await bot.setWebHook(webhookUrl);
                res.status(200).send('Webhook set successfully!');
            } catch (error) {
                console.error('Error setting webhook:', error);
                res.status(500).send('Error setting webhook');
            }
        }
    } catch (error) {
        console.error('Error in bot handler:', error);
        res.status(500).send('Internal Server Error');
    }
};
