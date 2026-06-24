const axios = require("axios");

// ================= CONFIG =================
const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

const ADMIN_IDS = [6581234524, 7133052934, 6343143457];
const CHANNELS = ["@AZ_Tricks", "@Hacking_Tricks0", "@a2z_hacking"];

const USERS = new Set();
const JOIN_CACHE = new Set();

// ================= HELPERS =================

function isAdmin(id) {
  return ADMIN_IDS.includes(Number(id));
}

async function sendMessage(chatId, text) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text
  });
}

async function deleteMessage(chatId, messageId) {
  try {
    await axios.post(`${API}/deleteMessage`, {
      chat_id: chatId,
      message_id: messageId
    });
  } catch {}
}

// ================= JOIN CHECK =================

async function checkJoin(userId) {
  if (JOIN_CACHE.has(userId)) return true;

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

    JOIN_CACHE.add(userId);
    return true;
  } catch {
    return false;
  }
}

// ================= FORMATTERS =================

function formatSIM(data) {
  if (!data?.success) return "📱 SIM: No Record Found\n";

  let out = "📱 SIM RECORDS\n";
  data.data.records.forEach((r, i) => {
    out += `\nRecord ${i + 1}\n`;
    out += `Name: ${r.full_name || "N/A"}\n`;
    out += `Mobile: ${r.phone || "N/A"}\n`;
    out += `CNIC: ${r.cnic || "N/A"}\n`;
    out += `Address: ${r.address || "N/A"}\n`;
    out += `----------------------\n`;
  });

  return out;
}

function formatNADRA(data) {
  const arr = Array.isArray(data) ? data : [];
  if (!arr.length) return "🟢 NADRA: No Record Found\n";

  let out = "🟢 NADRA ADDRESS\n";
  arr.forEach((r, i) => {
    out += `\nRecord ${i + 1}\n`;
    out += `Name: ${r.NAME || "N/A"}\n`;
    out += `CNIC: ${r.IDENTIFICATION_NO || "N/A"}\n`;
    out += `Present: ${r.PRESENT_ADDRESS || "N/A"}\n`;
    out += `Permanent: ${r.PERMANANT_ADDRESS || "N/A"}\n`;
    out += `Status: ${r.STATUS || "N/A"}\n`;
    out += `----------------------\n`;
  });

  return out;
}

function formatLAND(data, cnic) {
  const hits = data?.data?.responses?.[0]?.hits?.hits || [];

  if (!hits.length) {
    return `🏠 LAND RECORD (CNIC: ${cnic})\n\n❌ No Record Found\n`;
  }

  let out = `🏠 LAND RECORD (CNIC: ${cnic})\n\n`;

  hits.forEach((h, i) => {
    const s = h._source;

    out += `━━━━━━━━━━━━━━━━━━\n`;
    out += `📌 Record #${i + 1}\n`;
    out += `Registry No: ${s.RegisteredNumber || "N/A"}\n`;
    out += `Property: ${s.PropertyNumber || "N/A"}\n`;
    out += `Date: ${s.RegistryDate || "N/A"}\n`;
    out += `Tehsil: ${s.Tehsil || "N/A"}\n`;
    out += `Address: ${s.Address || "N/A"}\n`;
    out += `Area: ${s.Area || "N/A"}\n`;
    out += `Value: ${s.RegistryValue || "N/A"}\n\n`;
    out += `Type: ${s.RegistryType || "N/A"}\n`;   // <-- only raw type now

    out += `👥 Parties Details:\n`;

    (s.RegistryParties || []).forEach((p, idx) => {
      out += `  ${idx + 1})\n`;
      out += `     Name: ${p.Name || "N/A"}\n`;
      out += `     Father/Spouse: ${p.SpouseName || "N/A"}\n`;
      out += `     CNIC: ${p.CNIC || "N/A"}\n\n`;
    });

    out += `━━━━━━━━━━━━━━━━━━\n\n`;
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
    if (!msg || !msg.text) return res.status(200).send("OK");

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const userId = msg.from.id;

    USERS.add(userId);

    const joined = await checkJoin(userId);

    if (text !== "/start" && !joined) {
      await sendMessage(chatId, "⚠️ Please join channels first.");
      return res.status(200).send("OK");
    }

    // ================= CNIC FLOW =================
    if (/^\d{13}$/.test(text)) {
      const cnic = text;

      // STEP 1
      const msg1 = await sendMessage(chatId, "🔍 Searching CNIC...");
      const msg1Id = msg1.data.result.message_id;

      const url1 = `https://famofc.site/api/database.php/?q=${cnic}`;
      const url2 = `https://asadmughalfoundation.online/adr/api.php?cnic=${cnic}`;
      const url3 = `https://vercel-api-livid-tau.vercel.app/api/proxy?cnic=${cnic}`;

      const [r1, r2, r3] = await Promise.allSettled([
        axios.get(url1),
        axios.get(url2),
        axios.get(url3)
      ]);

      await deleteMessage(chatId, msg1Id);

      // STEP 2
      await sendMessage(
        chatId,
        `🆔 CNIC: ${cnic}\n\n` +
        formatSIM(r1?.value?.data) +
        "\n" +
        formatNADRA(r2?.value?.data)
      );

      // STEP 3
      const msg2 = await sendMessage(chatId, "⏳ Fetching Land Record...");
      const msg2Id = msg2.data.result.message_id;

      await deleteMessage(chatId, msg2Id);

      // STEP 4
      await sendMessage(
        chatId,
        `🆔 CNIC: ${cnic}\n\n` +
        formatLAND(r3?.value?.data)
      );

      return res.status(200).send("OK");
    }

    return res.status(200).send("OK");

  } catch (e) {
    console.log(e);
    return res.status(200).send("OK");
  }
};
      
