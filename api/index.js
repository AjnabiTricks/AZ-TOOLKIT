const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Your bot token
const token = '8914391257:AAF4gztf53yfp6Rn_MTpTpM1yw5YncFL960';
const bot = new TelegramBot(token, { polling: true });

// Helper function to format phone number (remove leading 0 and add country code if needed)
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

// Helper function to format CNIC (remove dashes)
function formatCNIC(cnic) {
    return cnic.replace(/-/g, '');
}

// Function to fetch SIM details by phone or CNIC
async function fetchSimDetails(query) {
    try {
        const url = `https://famofc.site/api/database.php?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching SIM details:', error);
        return null;
    }
}

// Function to fetch property registry details by CNIC
async function fetchPropertyDetails(cnic) {
    try {
        const url = `https://az-land-api.vercel.app/api/proxy?cnic=${encodeURIComponent(cnic)}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching property details:', error);
        return null;
    }
}

// Function to fetch nurse details by CNIC
async function fetchNurseDetails(cnic) {
    try {
        const url = `https://nurse-chi.vercel.app/api/search?cnic=${encodeURIComponent(cnic)}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching nurse details:', error);
        return null;
    }
}

// Function to download photo from URL
async function downloadPhoto(url) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });
        const tempPath = path.join(__dirname, `temp_${Date.now()}.jpg`);
        const writer = fs.createWriteStream(tempPath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(tempPath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading photo:', error);
        return null;
    }
}

// Command: /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🔍 *Welcome to Search Bot!*

I can help you search for:
1️⃣ *SIM Details* (by Phone or CNIC)
2️⃣ *Property Records* (by CNIC)
3️⃣ *Nurse Registration* (by CNIC)

*How to use:*
Send me a phone number or CNIC directly.
Or use these commands:
/search <phone/cnic>
/property <cnic>
/nurse <cnic>

*Example:*
/search 03086756345
/property 3210257170721
/nurse 4410307154760
    `;
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Command: /search [phone or cnic]
bot.onText(/\/search (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1].trim();
    
    // Check if it's a phone number (starts with 0 or 92)
    const isPhone = /^[0-9]{11,13}$/.test(query.replace(/[^0-9]/g, ''));
    
    let formattedQuery = query;
    if (isPhone) {
        formattedQuery = formatPhoneNumber(query);
    } else {
        formattedQuery = formatCNIC(query);
    }
    
    const result = await fetchSimDetails(formattedQuery);
    
    if (!result || !result.success) {
        bot.sendMessage(chatId, '❌ No records found or API error.');
        return;
    }
    
    const data = result.data;
    const records = data.records || [];
    
    if (records.length === 0) {
        bot.sendMessage(chatId, '❌ No records found.');
        return;
    }
    
    // Send each record separately
    let message = `📊 *Search Results*\n`;
    message += `🔍 Type: ${data.search_type === 'phone' ? 'Phone Number' : 'CNIC'}\n`;
    message += `📝 Records Found: ${records.length}\n\n`;
    
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        message += `*Record ${i + 1}:*\n`;
        message += `👤 Name: ${record.full_name || 'N/A'}\n`;
        message += `📱 Phone: ${record.phone || 'N/A'}\n`;
        message += `🆔 CNIC: ${record.cnic || 'N/A'}\n`;
        message += `📍 Address: ${record.address || 'N/A'}\n\n`;
        
        // Send in chunks if message becomes too long
        if (message.length > 4000) {
            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            message = '';
        }
    }
    
    if (message) {
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
});

// Command: /property [cnic]
bot.onText(/\/property (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const cnic = formatCNIC(match[1].trim());
    
    const result = await fetchPropertyDetails(cnic);
    
    if (!result || !result.success || result.total === 0) {
        bot.sendMessage(chatId, '❌ No property records found for this CNIC.');
        return;
    }
    
    const data = result.data[0];
    if (!data || !data._source) {
        bot.sendMessage(chatId, '❌ No property records found.');
        return;
    }
    
    const source = data._source;
    const parties = source.RegistryParties || [];
    
    let message = `🏠 *Property Record*\n\n`;
    message += `📋 Registry Number: ${source.RegisteredNumber || 'N/A'}\n`;
    message += `🏢 Property: ${source.PropertyNumber || 'N/A'}\n`;
    message += `📍 Mauza: ${source.MauzaName || 'N/A'}\n`;
    message += `🏘️ Tehsil: ${source.TeHSIL || 'N/A'}\n`;
    message += `📅 Registry Date: ${source.RegistryDate || 'N/A'}\n`;
    message += `💰 Value: ${source.RegistryValue ? `PKR ${source.RegistryValue.toLocaleString()}` : 'N/A'}\n`;
    message += `📐 Area: ${source.Area || 'N/A'}\n`;
    message += `📝 Type: ${source.RegistryType || 'N/A'}\n\n`;
    message += `👥 *Parties Involved:*\n`;
    
    for (let i = 0; i < parties.length; i++) {
        const party = parties[i];
        const partyType = party.RegistryPartiesTypeId === 31 ? 'Witness' : 
                         party.RegistryPartiesTypeId === 2 ? 'Seller' : 'Buyer';
        message += `\n*${partyType} ${i + 1}:*\n`;
        message += `👤 Name: ${party.Name || 'N/A'}\n`;
        message += `👨 Spouse: ${party.SpouseName || 'N/A'}\n`;
        message += `🆔 CNIC: ${party.CNIC || 'N/A'}\n`;
    }
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Command: /nurse [cnic]
bot.onText(/\/nurse (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const cnic = formatCNIC(match[1].trim());
    
    const result = await fetchNurseDetails(cnic);
    
    if (!result || !result.success) {
        bot.sendMessage(chatId, '❌ No nurse record found for this CNIC.');
        return;
    }
    
    const data = result.data;
    const photoUrl = result.photo;
    
    let message = `👩‍⚕️ *Nurse Registration Details*\n\n`;
    message += `👤 Name: ${data['Full Name'] || 'N/A'}\n`;
    message += `🆔 NIC Number: ${data['NIC Number'] || 'N/A'}\n`;
    message += `🎓 Qualification: ${data['Qualification'] || 'N/A'}\n`;
    message += `🔬 Speciality: ${data['Speciality'] || 'N/A'}\n`;
    message += `📋 Registration Category: ${data['Registration Category'] || 'N/A'}\n`;
    message += `🔢 Registration Number: ${data['Registration Number'] || 'N/A'}\n`;
    message += `📅 Initial Registration: ${data['Initial Registration Date'] || 'N/A'}\n`;
    message += `⏳ License Expiry: ${data['License Expiration Date'] || 'N/A'}\n`;
    
    // Send the text message first
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
    // Send photo if available
    if (photoUrl) {
        try {
            const photoPath = await downloadPhoto(photoUrl);
            if (photoPath) {
                await bot.sendPhoto(chatId, photoPath, {
                    caption: '📸 *Photo of the nurse*',
                    parse_mode: 'Markdown'
                });
                fs.unlinkSync(photoPath); // Clean up temp file
            }
        } catch (error) {
            console.error('Error sending photo:', error);
        }
    }
});

// Handle direct messages (phone or CNIC)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Ignore commands (they start with /)
    if (!text || text.startsWith('/')) return;
    
    const cleaned = text.replace(/\s/g, '');
    
    // Check if it's a phone number (11-13 digits, starts with 0 or 92)
    const isPhone = /^(0|92)[0-9]{10,12}$/.test(cleaned);
    
    if (isPhone) {
        // Search by phone
        const formattedQuery = formatPhoneNumber(cleaned);
        const result = await fetchSimDetails(formattedQuery);
        
        if (!result || !result.success) {
            bot.sendMessage(chatId, '❌ No records found.');
            return;
        }
        
        const data = result.data;
        const records = data.records || [];
        
        if (records.length === 0) {
            bot.sendMessage(chatId, '❌ No records found.');
            return;
        }
        
        let message = `📊 *SIM Details (Phone Search)*\n`;
        message += `📝 Records Found: ${records.length}\n\n`;
        
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            message += `*Record ${i + 1}:*\n`;
            message += `👤 Name: ${record.full_name || 'N/A'}\n`;
            message += `📱 Phone: ${record.phone || 'N/A'}\n`;
            message += `🆔 CNIC: ${record.cnic || 'N/A'}\n`;
            message += `📍 Address: ${record.address || 'N/A'}\n\n`;
        }
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
        // Check if it's a CNIC (13 digits, possibly with dashes)
        const cnicCleaned = cleaned.replace(/-/g, '');
        if (/^[0-9]{13}$/.test(cnicCleaned)) {
            // Search by CNIC - try SIM details first
            const simResult = await fetchSimDetails(cnicCleaned);
            if (simResult && simResult.success && simResult.data.records && simResult.data.records.length > 0) {
                const data = simResult.data;
                const records = data.records || [];
                
                let message = `📊 *SIM Details (CNIC Search)*\n`;
                message += `📝 Records Found: ${records.length}\n\n`;
                
                for (let i = 0; i < records.length; i++) {
                    const record = records[i];
                    message += `*Record ${i + 1}:*\n`;
                    message += `👤 Name: ${record.full_name || 'N/A'}\n`;
                    message += `📱 Phone: ${record.phone || 'N/A'}\n`;
                    message += `🆔 CNIC: ${record.cnic || 'N/A'}\n`;
                    message += `📍 Address: ${record.address || 'N/A'}\n\n`;
                }
                
                bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                return;
            }
            
            // Try property records
            const propResult = await fetchPropertyDetails(cnicCleaned);
            if (propResult && propResult.success && propResult.total > 0) {
                const data = propResult.data[0];
                if (data && data._source) {
                    const source = data._source;
                    const parties = source.RegistryParties || [];
                    
                    let message = `🏠 *Property Record*\n\n`;
                    message += `📋 Registry Number: ${source.RegisteredNumber || 'N/A'}\n`;
                    message += `🏢 Property: ${source.PropertyNumber || 'N/A'}\n`;
                    message += `📍 Mauza: ${source.MauzaName || 'N/A'}\n`;
                    message += `🏘️ Tehsil: ${source.TeHSIL || 'N/A'}\n`;
                    message += `📅 Registry Date: ${source.RegistryDate || 'N/A'}\n`;
                    message += `💰 Value: ${source.RegistryValue ? `PKR ${source.RegistryValue.toLocaleString()}` : 'N/A'}\n`;
                    message += `📐 Area: ${source.Area || 'N/A'}\n`;
                    message += `📝 Type: ${source.RegistryType || 'N/A'}\n\n`;
                    message += `👥 *Parties Involved:*\n`;
                    
                    for (let i = 0; i < parties.length; i++) {
                        const party = parties[i];
                        const partyType = party.RegistryPartiesTypeId === 31 ? 'Witness' : 
                                         party.RegistryPartiesTypeId === 2 ? 'Seller' : 'Buyer';
                        message += `\n*${partyType} ${i + 1}:*\n`;
                        message += `👤 Name: ${party.Name || 'N/A'}\n`;
                        message += `👨 Spouse: ${party.SpouseName || 'N/A'}\n`;
                        message += `🆔 CNIC: ${party.CNIC || 'N/A'}\n`;
                    }
                    
                    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                    return;
                }
            }
            
            // Try nurse records
            const nurseResult = await fetchNurseDetails(cnicCleaned);
            if (nurseResult && nurseResult.success) {
                const data = nurseResult.data;
                const photoUrl = nurseResult.photo;
                
                let message = `👩‍⚕️ *Nurse Registration Details*\n\n`;
                message += `👤 Name: ${data['Full Name'] || 'N/A'}\n`;
                message += `🆔 NIC Number: ${data['NIC Number'] || 'N/A'}\n`;
                message += `🎓 Qualification: ${data['Qualification'] || 'N/A'}\n`;
                message += `🔬 Speciality: ${data['Speciality'] || 'N/A'}\n`;
                message += `📋 Registration Category: ${data['Registration Category'] || 'N/A'}\n`;
                message += `🔢 Registration Number: ${data['Registration Number'] || 'N/A'}\n`;
                message += `📅 Initial Registration: ${data['Initial Registration Date'] || 'N/A'}\n`;
                message += `⏳ License Expiry: ${data['License Expiration Date'] || 'N/A'}\n`;
                
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                
                if (photoUrl) {
                    try {
                        const photoPath = await downloadPhoto(photoUrl);
                        if (photoPath) {
                            await bot.sendPhoto(chatId, photoPath, {
                                caption: '📸 *Photo of the nurse*',
                                parse_mode: 'Markdown'
                            });
                            fs.unlinkSync(photoPath);
                        }
                    } catch (error) {
                        console.error('Error sending photo:', error);
                    }
                }
                return;
            }
            
            bot.sendMessage(chatId, '❌ No records found for this CNIC.');
        } else {
            bot.sendMessage(chatId, '❌ Invalid input. Please send a valid phone number (starting with 0 or 92) or CNIC (13 digits).');
        }
    }
});

console.log('Bot is running...');
