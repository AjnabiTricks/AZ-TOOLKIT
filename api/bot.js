const axios = require("axios");

// 🔐 BOT TOKEN
const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

// 👑 ADMINS
const ADMIN_IDS = [6581234524, 7133052934, 6343143457];

// 👥 USERS
const USERS = new Set();

function isAdmin(id) {
  return ADMIN_IDS.includes(Number(id));
}

// 📢 CHANNELS
const CHANNELS = ["@AZ_Tricks", "@Hacking_Tricks0", "@a2z_hacking"];

// 🔒 JOIN CHECK
async function checkJoin(userId) {
  try {
    for (const ch of CHANNELS) {
      const res = await axios.get(
        `${API}/getChatMember?chat_id=${ch}&user_id=${userId}`
      );
      const status = res.data.result.status;
      if (!["member", "creator", "administrator"].includes(status)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// 📢 JOIN MSG
async function sendJoin(chatId) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text: "⚠️ Please join all channels first.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "AZ Tricks", url: "https://t.me/AZ_Tricks" }],
        [{ text: "Hacking Tricks", url: "https://t.me/Hacking_Tricks0" }],
        [{ text: "A2Z Hacking", url: "https://t.me/a2z_hacking" }],
        [{ text: "✅ Check Join", callback_data: "check_join" }]
      ]
    }
  });
}

// 📌 FOOTER
const FOOTER = `
━━━━━━━━━━━━━━
📢 WhatsApp Channel:
https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D
`;

/* ===================== HELPERS ===================== */

// 📱 SIM FORMATTER
function formatSIM(sim) {
  if (!sim?.success) return "📱 SIM: No Record Found\n\n";

  let out = "📱 SIM RECORDS\n\n";

  sim.data.records.forEach((r, i) => {
    out += `Record ${i + 1}\n`;
    out += `Name: ${r.full_name || "N/A"}\n`;
    out += `Mobile: ${r.phone || "N/A"}\n`;
    out += `CNIC: ${r.cnic || "N/A"}\n`;
    out += `Address: ${r.address || "N/A"}\n`;
    out += `━━━━━━━━━━━━━━\n\n`;
  });

  return out;
}

// 🟢 NADRA FORMATTER
function formatNADRA(nadra) {
  let arr = [];

  if (Array.isArray(nadra)) arr = nadra;
  else if (Array.isArray(nadra?.data)) arr = nadra.data;

  if (!arr.length) return "🟢 NADRA: No Record Found\n\n";

  let out = "🟢 NADRA ADDRESS\n\n";

  arr.forEach((r, i) => {
    out += `Record ${i + 1}\n`;
    out += `Name: ${r.NAME || "N/A"}\n`;
    out += `CNIC: ${r.IDENTIFICATION_NO || "N/A"}\n`;
    out += `Present Address: ${r.PRESENT_ADDRESS || "N/A"}\n`;
    out += `Permanent Address: ${r.PERMANANT_ADDRESS || "N/A"}\n`;
    out += `Status: ${r.STATUS ?? "N/A"}\n`;
    out += `━━━━━━━━━━━━━━\n\n`;
  });

  return out;
}

// 🏠 LAND FORMATTER (FULL FIX)
function formatLAND(data, cnic) {
  const hits = data?.data?.responses?.[0]?.hits?.hits || [];
  if (!hits.length) return "🏠 LAND: No Record Found\n\n";

  let out = "🏠 LAND RECORDS\n\n";

  let found = false;

  hits.forEach((item, i) => {
    const src = item._source;

    const parties = src.RegistryParties || [];
    const matched = parties.filter(p => p.CNIC === cnic);

    if (!matched.length) return;

    found = true;

    out += `📌 Record ${i + 1}\n`;
    out += `ID: ${src.Id}\n`;
    out += `Registry No: ${src.RegisteredNumber}\n`;
    out += `Property: ${src.PropertyNumber || "N/A"}\n`;
    out += `Registry Date: ${src.RegistryDate}\n`;
    out += `Tehsil: ${src.Tehsil || "N/A"}\n`;
    out += `Address: ${src.Address || "N/A"}\n`;
    out += `Area: ${src.Area || "N/A"}\n`;
    out += `Value: ${src.RegistryValue || "N/A"}\n`;
    out += `Type: ${src.RegistryType || "N/A"}\n\n`;

    out += `👥 ALL PARTIES:\n`;

    parties.forEach(p => {
      out += `• ${p.Name} | ${p.CNIC} | ${p.SpouseName || "N/A"}\n`;
    });

    out += `━━━━━━━━━━━━━━\n\n`;
  });

  return found ? out : "🏠 LAND: No Match Found\n\n";
}

/* ===================== MAIN ===================== */

module.exports = async (req, res) => {
  try {
    let body = req.body;
    if (!body) return res.status(200).send("OK");
    if (typeof body === "string") body = JSON.parse(body);

    const msg = body.message;
    const cb = body.callback_query;

    /* CALLBACK */
    if (cb) {
      const chatId = cb.message.chat.id;

      await axios.post(`${API}/answerCallbackQuery`, {
        callback_query_id: cb.id,
        text: "OK"
      });

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Send CNIC or Mobile Number"
      });

      return res.status(200).send("OK");
    }

    if (!msg || !msg.text) return res.status(200).send("OK");

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const userId = msg.from.id;

    USERS.add(userId);

    const joined = await checkJoin(userId);

    if (text !== "/start" && !joined) {
      await sendJoin(chatId);
      return res.status(200).send("OK");
    }

    /* START */
    if (text === "/start") {
      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Send CNIC or Mobile Number"
      });
    }

    /* PHONE */
    if (/^\d{10,11}$/.test(text)) {
      const phone = text.startsWith("0") ? text : "0" + text;

      const { data } = await axios.get(
        `https://famofc.site/api/database.php/?q=${phone}`
      );

      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: formatSIM(data) + FOOTER
      });
    }

    /* CNIC - ALL APIs */
    if (/^\d{13}$/.test(text)) {
      const url1 = `https://famofc.site/api/database.php/?q=${text}`;
      const url2 = `https://asadmughalfoundation.online/adr/api.php?cnic=${text}`;
      const url3 = `https://vercel-api-livid-tau.vercel.app/api/proxy?cnic=${text}`;

      const [r1, r2, r3] = await Promise.all([
        axios.get(url1).catch(() => null),
        axios.get(url2).catch(() => null),
        axios.get(url3).catch(() => null)
      ]);

      let out = "🆔 COMPLETE CNIC REPORT\n━━━━━━━━━━━━━━\n\n";

      out += formatSIM(r1?.data) + "\n";
      out += formatNADRA(r2?.data) + "\n";
      out += formatLAND(r3?.data, text) + "\n";

      out += FOOTER;

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
