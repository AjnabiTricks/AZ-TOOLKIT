const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// 🔴 PUT YOUR NEW TOKEN HERE (never share it again)
const TOKEN = '8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I';

const bot = new TelegramBot(TOKEN, { polling: true });

// 🔴 Your Channels
const CHANNELS = [
  '@AZ_Tricks',
  '@Hacking_Tricks0',
  '@a2z_hacking'
];

// ================= FORCE JOIN CHECK =================
async function checkAllChannels(userId) {
  try {
    for (const channel of CHANNELS) {
      const member = await bot.getChatMember(channel, userId);

      if (
        member.status !== 'member' &&
        member.status !== 'administrator' &&
        member.status !== 'creator'
      ) {
        return false;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

// ================= FORCE JOIN MESSAGE =================
function sendForceJoin(chatId) {
  return bot.sendMessage(
    chatId,
    "⚠️ Bot use karne ke liye pehle tamam channels join karein.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📢 Join AZ Tricks", url: "https://t.me/AZ_Tricks" }],
          [{ text: "📢 Join Hacking Tricks", url: "https://t.me/Hacking_Tricks0" }],
          [{ text: "📢 Join A2Z Hacking", url: "https://t.me/a2z_hacking" }],
          [{ text: "✅ Check Join", callback_data: "check_join" }]
        ]
      }
    }
  );
}

// ================= START COMMAND =================
bot.onText(/\/start/, async (msg) => {
  const joined = await checkAllChannels(msg.from.id);

  if (!joined) {
    return sendForceJoin(msg.chat.id);
  }

  bot.sendMessage(msg.chat.id, "✅ Welcome! Ab CNIC send karein.");
});

// ================= CHECK JOIN BUTTON =================
bot.on('callback_query', async (query) => {

  if (query.data === 'check_join') {

    const joined = await checkAllChannels(query.from.id);

    if (!joined) {
      return bot.answerCallbackQuery(query.id, {
        text: "❌ Pehle tamam channels join karein",
        show_alert: true
      });
    }

    await bot.answerCallbackQuery(query.id, {
      text: "✅ Verified Successfully"
    });

    return bot.sendMessage(
      query.message.chat.id,
      "🎉 Ab aap bot use kar sakte hain. CNIC send karein."
    );
  }
});

// ================= CNIC SEARCH =================
bot.on('message', async (msg) => {

  if (!msg.text || msg.text.startsWith('/start')) return;

  const joined = await checkAllChannels(msg.from.id);

  if (!joined) {
    return sendForceJoin(msg.chat.id);
  }

  const cnic = msg.text.trim();

  // CNIC validation (13 digits)
  if (!/^\d{13}$/.test(cnic)) {
    return bot.sendMessage(msg.chat.id, "❌ Invalid CNIC. 13 digits send karein.");
  }

  try {
    const apiURL = `https://famofc.site/api/database.php/?q=${cnic}`;
    const response = await axios.get(apiURL);

    const data = response.data;

    if (!data.success || !data.data.records.length) {
      return bot.sendMessage(msg.chat.id, "❌ No record found.");
    }

    let text = `🔍 CNIC RESULT\n\n`;

    data.data.records.forEach((r, i) => {
      text += `📄 Record ${i + 1}\n`;
      text += `👤 Name: ${r.full_name}\n`;
      text += `📱 Phone: ${r.phone}\n`;
      text += `🆔 CNIC: ${r.cnic}\n`;
      text += `🏠 Address: ${r.address}\n\n`;
    });

    bot.sendMessage(msg.chat.id, text);

  } catch (error) {
    bot.sendMessage(msg.chat.id, "⚠️ API error, try again later.");
  }
});
