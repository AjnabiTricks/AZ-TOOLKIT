const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const app = express();

// Bot Token
const BOT_TOKEN = process.env.BOT_TOKEN || '8914391257:AAGxjKK2sZ8DFNR5V4HQPc3_4a2TktTU0lo';
const bot = new Telegraf(BOT_TOKEN);

// 👑 ADMINS
const ADMIN_IDS = [
  6581234524,
  7133052934,
  6343143457
];

// 📢 CHANNELS
const CHANNELS = [
  "@AZ_Tricks",
  "@Hacking_Tricks0",
  "@a2z_hacking"
];

// API Base URL
const API_URL = 'https://famofc.site/api/database.php';

// Check if user is subscribed to all channels
async function checkSubscription(userId) {
  try {
    for (const channel of CHANNELS) {
      const chatMember = await bot.telegram.getChatMember(channel, userId);
      if (chatMember.status === 'left' || chatMember.status === 'kicked') {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Subscription check error:', error);
    return false;
  }
}

// Check if user is admin
function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

// Format records for display
function formatRecords(records, searchType, query) {
  let result = `🔍 *Search Results*\n`;
  result += `━━━━━━━━━━━━━━━━━━━━━\n`;
  result += `📌 *Search Type:* ${searchType}\n`;
  result += `🔎 *Query:* ${query}\n`;
  result += `📊 *Records Found:* ${records.length}\n`;
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

// Fetch data from API
async function fetchData(query) {
  try {
    const response = await axios.get(API_URL, {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

// Start command
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const isSubscribed = await checkSubscription(userId);
  const isAdminUser = isAdmin(userId);

  if (!isSubscribed && !isAdminUser) {
    const channelsList = CHANNELS.map(ch => `• ${ch}`).join('\n');
    const message = `⚠️ *Access Denied!*\n\n` +
      `You must join the following channels to use this bot:\n\n` +
      `${channelsList}\n\n` +
      `After joining, click /start again.`;

    return ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        CHANNELS.map(ch => Markup.button.url(ch, `https://t.me/${ch.replace('@', '')}`))
      ])
    });
  }

  const welcomeMessage = `🤖 *Welcome to AZ TOOLKIT!*\n\n` +
    `I can search for information using CNIC or Phone Number.\n\n` +
    `📌 *How to use:*\n` +
    `Send me a CNIC or Phone Number\n` +
    `Example:\n` +
    `• CNIC: 3220282538606\n` +
    `• Phone: 03086756345\n\n` +
    `⚡ *Bot is ready to use!*`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📢 Join WhatsApp Channel', 'https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D')],
      [Markup.button.url('🔰 My Channel', 'https://t.me/AZ_Tricks')]
    ])
  });
});

// Handle text messages
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const query = ctx.message.text.trim();
  const isSubscribed = await checkSubscription(userId);
  const isAdminUser = isAdmin(userId);

  // Check subscription
  if (!isSubscribed && !isAdminUser) {
    const channelsList = CHANNELS.map(ch => `• ${ch}`).join('\n');
    const message = `⚠️ *Access Denied!*\n\n` +
      `You must join all channels to use this bot:\n\n` +
      `${channelsList}\n\n` +
      `After joining, try again.`;

    return ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        CHANNELS.map(ch => Markup.button.url(ch, `https://t.me/${ch.replace('@', '')}`))
      ])
    });
  }

  // Validate input
  const isPhone = /^03\d{9}$/.test(query) || /^3\d{9}$/.test(query);
  const isCNIC = /^\d{13}$/.test(query);

  if (!isPhone && !isCNIC) {
    return ctx.reply(
      '❌ *Invalid Input!*\n\n' +
      'Please send a valid:\n' +
      '• CNIC (13 digits)\n' +
      '• Phone Number (03XXXXXXXXX)',
      { parse_mode: 'Markdown' }
    );
  }

  // Send processing message
  const processingMsg = await ctx.reply('⏳ *Processing your request...*', {
    parse_mode: 'Markdown'
  });

  try {
    // Fetch data from API
    const data = await fetchData(query);

    if (!data || !data.success) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        null,
        '❌ *Error:* Failed to fetch data or API returned error.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const records = data.data.records || [];
    const searchType = data.data.search_type || 'unknown';
    const inputQuery = data.data.input_query || query;

    // Format and send results
    const resultText = formatRecords(records, searchType, inputQuery);

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      resultText,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error:', error);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '❌ *Error occurred while processing your request.*\nPlease try again later.',
      { parse_mode: 'Markdown' }
    );
  }
});

// Admin commands
bot.command('admin', async (ctx) => {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    return ctx.reply('⛔ *You are not authorized to use this command.*', {
      parse_mode: 'Markdown'
    });
  }

  const adminMenu = `👑 *Admin Panel*\n\n` +
    `📊 *Bot Status:* Active\n` +
    `👥 *Total Admins:* ${ADMIN_IDS.length}\n` +
    `📢 *Channels:* ${CHANNELS.length}\n\n` +
    `🛠 *Commands:*\n` +
    `/stats - View bot stats\n` +
    `/broadcast - Send message to all users (coming soon)`;

  await ctx.reply(adminMenu, { parse_mode: 'Markdown' });
});

// Stats command (admin only)
bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    return ctx.reply('⛔ *Unauthorized!*', { parse_mode: 'Markdown' });
  }

  const stats = `📊 *Bot Statistics*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 *Status:* Online\n` +
    `👑 *Admins:* ${ADMIN_IDS.length}\n` +
    `📢 *Channels:* ${CHANNELS.length}\n` +
    `⚡ *API:* Active\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🤖 *AZ TOOLKIT v1.0*`;

  await ctx.reply(stats, { parse_mode: 'Markdown' });
});

// Health check for Vercel
app.get('/', (req, res) => {
  res.send('🤖 AZ TOOLKIT Bot is running!');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'AZ TOOLKIT',
    admins: ADMIN_IDS.length,
    channels: CHANNELS.length
  });
});

// Webhook for Vercel
app.use(bot.webhookCallback('/webhook'));

// Export for Vercel
module.exports = app;
