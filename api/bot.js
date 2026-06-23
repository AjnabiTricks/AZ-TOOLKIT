const axios = require("axios");

// 🔐 BOT TOKEN
const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

// 👑 ADMINS
const ADMIN_IDS = [6581234524, 7133052934, 6343143457];

// 👥 USERS (runtime memory only)
const USERS = new Set();

// 🧠 JOIN CACHE (IMPORTANT FIX)
const JOINED_CACHE = new Set();

function isAdmin(id) {
  return ADMIN_IDS.includes(Number(id));
}

// 📢 CHANNELS
const CHANNELS = ["@AZ_Tricks", "@Hacking_Tricks0", "@a2z_hacking"];

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

// 📢 JOIN MESSAGE (ONLY ONCE)
async function sendJoin(chatId, userId) {
  if (JOINED_CACHE.has(userId)) return;

  await axios.post(`${API}/sendMessage`, {
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

  JOINED_CACHE.add(userId);
}

// 📌 FOOTER
const FOOTER = `
━━━━━━━━━━━━━━
📢 WhatsApp Channel:
https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D
`;

// ================= FORMATTERS =================

// 📱 SIM
function formatSIM(data, cnic) {
  if (!data?.success) return `📱 SIM: No Record Found (${cnic})\n\n`;

  let out = `📱 SIM RECORDS (CNIC: ${cnic})\n\n`;

  data.data.records.forEach((r, i) => {
    out += `━━━━━━━━━━━━━━\n`;
    out += `Name: ${r.full_name || "N/A"}\n`;
    out += `Mobile: ${r.phone || "N/A"}\n`;
    out += `CNIC: ${r.cnic || cnic}\n`;
    out += `Address: ${r.address || "N/A"}\n\n`;
  });

  return out;
}

// 🟢 NADRA
function formatNADRA(data, cnic) {
  const arr = Array.isArray(data) ? data : [];

  if (!arr.length) return `🟢 NADRA: No Record Found (${cnic})\n\n`;

  let out = `🟢 NADRA ADDRESS (CNIC: ${cnic})\n\n`;

  arr.forEach((r, i) => {
    out += `━━━━━━━━━━━━━━\n`;
    out += `Name: ${r.NAME || "N/A"}\n`;
    out += `CNIC: ${r.IDENTIFICATION_NO || cnic}\n`;
    out += `Present: ${r.PRESENT_ADDRESS || "N/A"}\n`;
    out += `Permanent: ${r.PERMANANT_ADDRESS || "N/A"}\n`;
    out += `Status: ${r.STATUS || "N/A"}\n\n`;
  });

  return out;
}

// 🏠 LAND (FINAL FIXED)
function formatLAND(data, cnic) {
  const hits = data?.data?.responses?.[0]?.hits?.hits || [];

  if (!hits.length) {
    return `🏠 LAND RECORD\n\n❌ No Record Found\n`;
  }

  let out = `🏠 LAND RECORD (CNIC: ${cnic || "N/A"})\n\n`;

  hits.forEach((h, i) => {
    const s = h._source;

    out += `━━━━━━━━━━━━━━\n`;
    out += `📌 Record #${i + 1}\n`;
    out += `Registry No: ${s.RegisteredNumber || "N/A"}\n`;
    out += `Property: ${s.PropertyNumber || "N/A"}\n`;
    out += `Date: ${s.RegistryDate || "N/A"}\n`;
    out += `Tehsil: ${s.Tehsil || "N/A"}\n`;
    out += `Address: ${s.Address || "N/A"}\n`;
    out += `Area: ${s.Area || "N/A"}\n`;
    out += `Value: ${s.RegistryValue || "N/A"}\n`;
    out += `Type: ${s.RegistryType || "N/A"}\n\n`; // FIXED POSITION

    out += `👥 Parties Details:\n`;

    (s.RegistryParties || []).forEach((p, idx) => {
      out += `  ${idx + 1}) ${p.Name || "N/A"} | ${p.SpouseName || "N/A"} | ${p.CNIC || "N/A"}\n`;
    });

    out += `━━━━━━━━━━━━━━\n\n`;
  });

  return out;
}

// ================= MAIN =================

module.exports = async (req, res) => {
  try {
    let body = req.body;
    if (!body) return res.status(200).send("OK");
    if (typeof body === "string") body = JSON.parse(body);

    const msg = body.message;
    const cb = body.callback_query;

    // ================= CALLBACK =================
    if (cb) {
      const chatId = cb.message.chat.id;
      const userId = cb.from.id;

      const joined = await checkJoin(userId);

      await axios.post(`${API}/answerCallbackQuery`, {
        callback_query_id: cb.id,
        text: joined ? "Joined ✓" : "Not joined"
      });

      if (joined) {
        JOINED_CACHE.add(userId);
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: joined
          ? "👋 Welcome!\nSend CNIC or Mobile Number"
          : "⚠️ Please join all channels first."
      });

      return res.status(200).send("OK");
    }

    if (!msg || !msg.text) return res.status(200).send("OK");

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const userId = msg.from.id;

    USERS.add(userId);

    const joined = await checkJoin(userId);

    // ❌ force join only if NOT joined
    if (!joined && text !== "/start") {
      await sendJoin(chatId, userId);
      return res.status(200).send("OK");
    }

    // ================= START =================
    if (text === "/start") {
      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Send CNIC or Mobile Number"
      });

      return res.status(200).send("OK");
    }

    // ================= PHONE =================
    if (/^\d{10,11}$/.test(text)) {
      const phone = text.startsWith("0") ? text : "0" + text;

      const { data } = await axios.get(
        `https://famofc.site/api/database.php/?q=${phone}`
      );

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: formatSIM(data, phone) + FOOTER
      });

      return res.status(200).send("OK");
    }

    // ================= CNIC FLOW =================
    if (/^\d{13}$/.test(text)) {
      const cnic = text;

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "🔍 Searching CNIC..."
      });

      const url1 = `https://famofc.site/api/database.php/?q=${cnic}`;
      const url2 = `https://asadmughalfoundation.online/adr/api.php?cnic=${cnic}`;
      const url3 = `https://vercel-api-livid-tau.vercel.app/api/proxy?cnic=${cnic}`;

      const [r1, r2, r3] = await Promise.all([
        axios.get(url1).catch(() => null),
        axios.get(url2).catch(() => null),
        axios.get(url3).catch(() => null)
      ]);

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text:
          formatSIM(r1?.data, cnic) +
          "\n" +
          formatNADRA(r2?.data, cnic) +
          FOOTER
      });

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "⏳ Fetching Land Record..."
      });

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: formatLAND(r3?.data, cnic)
      });

      return res.status(200).send("OK");
    }

    return res.status(200).send("OK");
  } catch (e) {
    console.log(e);
    return res.status(200).send("OK");
  }
};
