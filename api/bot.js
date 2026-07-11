const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// Create Express app
const app = express();
app.use(express.json());

// Bot setup
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// 👑 ADMINS
const ADMIN_IDS = [6581234524, 7133052934, 6343143457];

// 📢 CHANNELS
const CHANNELS = ["@AZ_Tricks", "@Hacking_Tricks0", "@a2z_hacking"];

// API URL
const API_URL = 'https://famofc.site/api/database.php';

// ===== BOT FUNCTIONS (Copy from previous code) =====
async function checkSubscription(userId) {
  try {
    for (const channel of CHANNELS) {
      try {
        const chatMember = await bot.telegram.getChatMember(channel, userId);
        if (chatMember.status === 'left' || chatMember.status === 'kicked') {
          return false;
        }
      } catch (err) {
        console.log(`Channel check error for ${channel}:`, err.message);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Subscription check error:', error);
    return false;
  }
}

function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

function formatRecords(data, query) {
  const records = data.records || [];
  const searchType = data.search_type || 'unknown';
  
  let result = `🔍 *Search Results*\n`;
  result += `━━━━━━━━━━━━━━━━━━━━━\n`;
  result += `📌 *Type:* ${searchType.toUpperCase()}\n`;
  result += `🔎 *Query:* ${query}\n`;
  result += `📊 *Records:* ${records.length}\n`;
  result += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (records.length === 0) {
    result += `❌ *No records found!*`;
    return result;
  }

  records.forEach((record, index) => {
    result += `👤 *Record #${index + 1}*\n`;
    result += `📛 *Name:* ${record.full_name || 'N/A'}\n`;
    result += `📱 *Phone:* ${record.phone || 'N/A'}\n`;
    result += `🆔 *CNIC:* ${record.cnic || 'N/A'}\n`;
    result += `📍 *Address:* ${record.address || 'N/A'}\n`;
    result += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  });

  result += `📢 *WhatsApp Channel:*\n`;
  result += `https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D\n`;
  result += `━━━━━━━━━━━━━━━━━━━━━\n`;
  result += `🤖 *Powered By AZ TOOLKIT*`;

  return result;
}

async function fetchData(query) {
  try {
    const response = await axios.get(API_URL, {
      params: { q: query },
      timeout: 30000
    });
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      console.error('API returned unsuccessful:', response.data);
      return null;
    }
  } catch (error) {
    console.error('API Error:', error.message);
    return null;
  }
}

// ===== BOT COMMANDS =====
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const isSubscribed = await checkSubscription(userId);
  const isAdminUser = isAdmin(userId);

  if (!isSubscribed && !isAdminUser) {
    const channelsList = CHANNELS.map(ch => `• ${ch}`).join('\n');
    const message = `⚠️ *Access Denied!*\n\nYou must join the following channels to use this bot:\n\n${channelsList}\n\nAfter joining, click /start again.`;

    const buttons = CHANNELS.map(ch => 
      Markup.button.url(ch, `https://t.me/${ch.replace('@', '')}`)
    );
    
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }

    return ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(rows)
    });
  }

  const welcomeMessage = `🤖 *Welcome to AZ TOOLKIT!*\n\nI can search for information using CNIC or Phone Number.\n\n📌 *How to use:*\nSend me a CNIC or Phone Number\n\n📱 *Phone:* 03086756345\n🆔 *CNIC:* 3220282538606\n\n⚡ *Bot is ready to use!*`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📢 Join WhatsApp Channel', 'https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D')],
      [Markup.button.url('🔰 My Channel', 'https://t.me/AZ_Tricks')]
    ])
  });
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const query = ctx.message.text.trim();
  const isSubscribed = await checkSubscription(userId);
  const isAdminUser = isAdmin(userId);

  if (!isSubscribed && !isAdminUser) {
    const channelsList = CHANNELS.map(ch => `• ${ch}`).join('\n');
    const message = `⚠️ *Access Denied!*\n\nYou must join all channels to use this bot:\n\n${channelsList}\n\nAfter joining, try again.`;

    const buttons = CHANNELS.map(ch => 
      Markup.button.url(ch, `https://t.me/${ch.replace('@', '')}`)
    );
    
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }

    return ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(rows)
    });
  }

  if (query.startsWith('/')) {
    return;
  }

  const isPhone = /^03\d{9}$/.test(query) || /^3\d{9}$/.test(query);
  const isCNIC = /^\d{13}$/.test(query);

  if (!isPhone && !isCNIC) {
    return ctx.reply(
      '❌ *Invalid Input!*\n\nPlease send a valid:\n• CNIC (13 digits)\n• Phone Number (03XXXXXXXXX)\n\nExample:\n📱 03086756345\n🆔 3220282538606',
      { parse_mode: 'Markdown' }
    );
  }

  await ctx.sendChatAction('typing');

  try {
    const apiResponse = await fetchData(query);

    if (!apiResponse || !apiResponse.success) {
      return ctx.reply(
        '❌ *Error:* Failed to fetch data from API.\nPlease try again later or contact admin.',
        { parse_mode: 'Markdown' }
      );
    }

    const records = apiResponse.data.records || [];
    const searchType = apiResponse.data.search_type || 'unknown';
    
    if (records.length === 0) {
      return ctx.reply(
        '❌ *No records found!*\n\n🔎 *Query:* ${query}\n📌 *Type:* ${searchType}\n\nTry again with different input.',
        { parse_mode: 'Markdown' }
      );
    }

    const resultText = formatRecords(apiResponse.data, query);
    
    if (resultText.length > 4096) {
      const chunks = resultText.match(/[\s\S]{1,4000}/g) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'Markdown' });
      }
    } else {
      await ctx.reply(resultText, { parse_mode: 'Markdown' });
    }

  } catch (error) {
    console.error('Error processing request:', error);
    await ctx.reply(
      '❌ *Error occurred while processing your request.*\nPlease try again later.',
      { parse_mode: 'Markdown' }
    );
  }
});

bot.command('admin', async (ctx) => {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    return ctx.reply('⛔ *You are not authorized to use this command.*', {
      parse_mode: 'Markdown'
    });
  }

  const adminMenu = `👑 *Admin Panel*\n━━━━━━━━━━━━━━━━━━━━━\n📊 *Status:* 🟢 Active\n👥 *Admins:* ${ADMIN_IDS.length}\n📢 *Channels:* ${CHANNELS.length}\n━━━━━━━━━━━━━━━━━━━━━\n🤖 *AZ TOOLKIT v2.0*`;

  await ctx.reply(adminMenu, { 
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📢 WhatsApp Channel', 'https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D')]
    ])
  });
});

bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    return ctx.reply('⛔ *Unauthorized!*', { parse_mode: 'Markdown' });
  }

  const stats = `📊 *Bot Statistics*\n━━━━━━━━━━━━━━━━━━━━━\n📅 *Status:* 🟢 Online\n👑 *Admins:* ${ADMIN_IDS.length}\n📢 *Channels:* ${CHANNELS.length}\n⚡ *API:* Active\n🕐 *Uptime:* ${Math.floor(process.uptime())}s\n━━━━━━━━━━━━━━━━━━━━━\n🤖 *AZ TOOLKIT v2.0*`;

  await ctx.reply(stats, { parse_mode: 'Markdown' });
});

// ===== WEBHOOK ENDPOINTS =====
// Main webhook endpoint - Telegram sends updates here
app.post('/bot', (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Health check for GET requests
app.get('/bot', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Webhook endpoint is working',
    bot: 'AZ TOOLKIT'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    bot: 'AZ TOOLKIT',
    version: '2.0'
  });
});

// ===== EXPORT FOR VERCEL =====
module.exports = app;

// IMPORTANT: Do NOT call bot.launch() here - Vercel handles it
