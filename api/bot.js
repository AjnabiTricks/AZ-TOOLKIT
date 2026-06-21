const axios = require("axios");

// 🔐 BOT TOKEN
const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

// 👑 ADMINS
const ADMIN_IDS = [
  6581234524,
  7133052934,
  6343143457
];

// 👥 TEMP USER STORE (resets on redeploy)
const USERS = new Set();

function isAdmin(userId) {
  return ADMIN_IDS.includes(Number(userId));
}

// 📢 CHANNELS (FORCE JOIN)
const CHANNELS = [
  "@AZ_Tricks",
  "@Hacking_Tricks0",
  "@a2z_hacking"
];

// 🔒 CHECK JOIN
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

// 📢 JOIN MESSAGE
async function sendJoin(chatId) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text: "⚠️ Bot use karne ke liye tamam channels join karein.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢 AZ Tricks", url: "https://t.me/AZ_Tricks" }],
        [{ text: "📢 Hacking Tricks", url: "https://t.me/Hacking_Tricks0" }],
        [{ text: "📢 A2Z Hacking", url: "https://t.me/a2z_hacking" }]
      ]
    }
  });
}

// 🚀 MAIN BOT
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

    // 👥 TRACK USERS
    USERS.add(userId);

    // 🔒 FORCE JOIN CHECK
    const joined = await checkJoin(userId);

    if (text !== "/start" && !joined) {
      await sendJoin(chatId);
      return res.status(200).send("OK");
    }

    // 🔹 START
    if (text === "/start") {

      if (!joined) {
        await sendJoin(chatId);
        return res.status(200).send("OK");
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome!\nBot is working perfectly."
      });

      return res.status(200).send("OK");
    }

    // 👑 ADMIN PANEL
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

    // 📊 STATS
    if (text === "/stats") {

      if (!isAdmin(userId)) {
        return res.status(200).send("OK");
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `📊 BOT STATS

✅ Status: Running on Vercel
👥 Active Users (Session): ${USERS.size}`
      });

      return res.status(200).send("OK");
    }

    // 👥 USERS COUNT
    if (text === "/users") {

      if (!isAdmin(userId)) {
        return res.status(200).send("OK");
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👥 Total Users (Session): ${USERS.size}`
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
