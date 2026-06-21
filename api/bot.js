const ADMIN_IDS = [
  6581234524,
  7133052934,
  6343143457
];

const axios = require("axios");

const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

const CHANNELS = [
  "@AZ_Tricks",
  "@Hacking_Tricks0",
  "@a2z_hacking"
];

// 🔒 CHECK ADMIN
function isAdmin(userId) {
  return ADMIN_IDS.includes(Number(userId));
}

// 🔒 CHECK JOIN FUNCTION
async function checkJoin(userId) {
  try {
    for (const ch of CHANNELS) {
      const res = await axios.get(
        `${API}/getChatMember?chat_id=${ch}&user_id=${userId}`
      );

      const status = res.data.result.status;

      if (!["member", "creator", "administrator"].includes(status)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// 📢 FORCE JOIN MESSAGE
async function sendJoin(chatId) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text: "⚠️ Bot use karne ke liye pehle tamam channels join karein.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢 AZ Tricks", url: "https://t.me/AZ_Tricks" }],
        [{ text: "📢 Hacking Tricks", url: "https://t.me/Hacking_Tricks0" }],
        [{ text: "📢 A2Z Hacking", url: "https://t.me/a2z_hacking" }],
        [{ text: "✅ Check Join", callback_data: "check_join" }]
      ]
    }
  });
}

module.exports = async (req, res) => {
  try {

    let body = req.body;
    if (!body) return res.status(200).send("OK");
    if (typeof body === "string") body = JSON.parse(body);

    const msg = body.message;
    if (!msg || !msg.text) return res.status(200).send("OK");

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const userId = msg.from.id;

    // 🔒 /start
    if (text === "/start") {
      const joined = await checkJoin(userId);

      if (!joined) {
        await sendJoin(chatId);
        return res.status(200).send("OK");
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome!\nSend CNIC or Mobile Number"
      });

      return res.status(200).send("OK");
    }

    // 🔒 force join for every request
    const joined = await checkJoin(userId);
    if (!joined) {
      await sendJoin(chatId);
      return res.status(200).send("OK");
    }

    // 👑 ADMIN COMMAND (FIXED)
    if (text === "/admin") {

      if (!isAdmin(userId)) {
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Access Denied"
        });
        return res.status(200).send("OK");
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👑 ADMIN PANEL

📊 /stats
👥 /users`
      });

      return res.status(200).send("OK");
    }

    // 👥 USERS COUNT (TEMP SIMPLE)
    if (text === "/users") {

      if (!isAdmin(userId)) {
        return res.status(200).send("OK");
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👥 Bot is Active`
      });

      return res.status(200).send("OK");
    }

    // 📱 PHONE SEARCH
    if (/^\d{10,11}$/.test(text)) {

      const phone = text.startsWith("0") ? text : "0" + text;

      const url = `https://famofc.site/api/database.php/?q=${phone}`;
      const resp = await axios.get(url);
      const data = resp.data;

      if (!data.success) {
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "❌ No record found"
        });
        return res.status(200).send("OK");
      }

      let out = "📱 PHONE RESULT\n\n";

      data.data.records.forEach((r, i) => {
        out += `Record ${i + 1}\n`;
        out += `Name: ${r.full_name}\n`;
        out += `Phone: ${r.phone}\n`;
        out += `CNIC: ${r.cnic}\n`;
        out += `Address: ${r.address}\n\n`;
      });

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: out
      });

      return res.status(200).send("OK");
    }

    // 🆔 CNIC SEARCH
    if (/^\d{13}$/.test(text)) {

      const url = `https://famofc.site/api/database.php/?q=${text}`;
      const resp = await axios.get(url);
      const data = resp.data;

      if (!data.success) {
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "❌ No record found"
        });
        return res.status(200).send("OK");
      }

      let out = "🆔 CNIC RESULT\n\n";

      data.data.records.forEach((r, i) => {
        out += `Record ${i + 1}\n`;
        out += `Name: ${r.full_name}\n`;
        out += `Phone: ${r.phone}\n`;
        out += `CNIC: ${r.cnic}\n`;
        out += `Address: ${r.address}\n\n`;
      });

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: out
      });

      return res.status(200).send("OK");
    }

    return res.status(200).send("OK");

  } catch (e) {
    console.log(e);
    return res.status(200).send("OK");
  }
};
