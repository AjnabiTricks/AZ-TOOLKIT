const axios = require("axios");

// 🔐 BOT TOKEN
const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

// 👑 ADMINS
const ADMIN_IDS = [6581234524, 7133052934, 6343143457];

// 👥 USERS (RAM based counter)
const USERS = new Set();

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

// 📢 JOIN MESSAGE
async function sendJoin(chatId) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text: "⚠️ Please join all channels first.",
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

// 📢 FOOTER
const FOOTER = `
━━━━━━━━━━━━━━
📢 WhatsApp Channel:
https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D
`;

// 🟢 NADRA PARSER
function parseNadra(data, cnic) {
  let arr = [];

  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.data)) arr = data.data;

  if (!arr.length) return "";

  let out = "🟢 NADRA ADDRESS\n\n";

  arr.forEach((r, i) => {
    out += `Record ${i + 1}\n`;
    out += `Name: ${r.NAME || "N/A"}\n`;
    out += `CNIC: ${r.IDENTIFICATION_NO || cnic}\n`;
    out += `Present Address: ${r.PRESENT_ADDRESS || "N/A"}\n`;
    out += `Permanent Address: ${r.PERMANANT_ADDRESS || "N/A"}\n`;
    out += `Status: ${r.STATUS ?? "N/A"}\n\n`;
  });

  return out;
}

// 🏠 LAND PARSER (CNIC FILTERED)
function parseLand(data, cnic) {
  const hits = data?.data?.responses?.[0]?.hits?.hits || [];

  if (!hits.length) return "";

  let out = "🏠 LAND RECORDS\n\n";
  let found = false;

  hits.forEach((item, i) => {
    const src = item._source;

    const matched = (src.RegistryParties || []).filter(
      p => p.CNIC === cnic
    );

    if (!matched.length) return;

    found = true;

    out += `📌 Record ${i + 1}\n`;
    out += `ID: ${src.Id}\n`;
    out += `Registry: ${src.RegisteredNumber}\n`;
    out += `Property: ${src.PropertyNumber || "N/A"}\n`;
    out += `Date: ${src.RegistryDate}\n`;
    out += `Tehsil: ${src.Tehsil || "N/A"}\n`;
    out += `Address: ${src.Address || "N/A"}\n\n`;

    out += `👥 Persons:\n`;

    matched.forEach(p => {
      out += `• ${p.Name} | ${p.CNIC}\n`;
    });

    out += `━━━━━━━━━━━━━━\n\n`;
  });

  return found ? out : "";
}

module.exports = async (req, res) => {
  try {
    let body = req.body;
    if (!body) return res.status(200).send("OK");
    if (typeof body === "string") body = JSON.parse(body);

    const msg = body.message;
    const cb = body.callback_query;

    // ================= CALLBACK =================
    if (cb) {
      const userId = cb.from.id;
      const chatId = cb.message.chat.id;

      const joined = await checkJoin(userId);

      if (joined) {
        await axios.post(`${API}/answerCallbackQuery`, {
          callback_query_id: cb.id,
          text: "✅ Verified"
        });

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "👋 Send CNIC or Mobile Number"
        });
      } else {
        await axios.post(`${API}/answerCallbackQuery`, {
          callback_query_id: cb.id,
          text: "❌ Join required",
          show_alert: true
        });
      }

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

    // ================= START =================
    if (text === "/start") {
      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome!\nSend CNIC or Mobile Number"
      });
      return res.status(200).send("OK");
    }

    // ================= ADMIN =================
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
        text: "👑 ADMIN\n\n/stats\n/users"
      });

      return res.status(200).send("OK");
    }

    // ================= STATS =================
    if (text === "/stats") {
      if (!isAdmin(userId)) return;

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `📊 STATS\nUsers: ${USERS.size}`
      });

      return res.status(200).send("OK");
    }

    // ================= USERS =================
    if (text === "/users") {
      if (!isAdmin(userId)) return;

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👥 USERS: ${USERS.size}`
      });

      return res.status(200).send("OK");
    }

    // ================= PHONE =================
    if (/^\d{10,11}$/.test(text)) {
      const phone = text.startsWith("0") ? text : "0" + text;

      const url = `https://famofc.site/api/database.php/?q=${phone}`;
      const { data } = await axios.get(url);

      if (!data.success) {
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "❌ No SIM record found"
        });
        return res.status(200).send("OK");
      }

      let out = "📱 SIM RECORDS\n\n";

      data.data.records.forEach((r, i) => {
        out += `Record ${i + 1}\n`;
        out += `Name: ${r.full_name}\n`;
        out += `Phone: ${r.phone}\n`;
        out += `CNIC: ${r.cnic}\n`;
        out += `Address: ${r.address}\n\n`;
      });

      out += FOOTER;

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: out
      });

      return res.status(200).send("OK");
    }

    // ================= CNIC (ALL APIs) =================
    if (/^\d{13}$/.test(text)) {
      const url1 = `https://famofc.site/api/database.php/?q=${text}`;
      const url2 = `https://asadmughalfoundation.online/adr/api.php?cnic=${text}`;
      const url3 = `https://vercel-api-livid-tau.vercel.app/api/proxy?cnic=${text}`;

      const [r1, r2, r3] = await Promise.all([
        axios.get(url1).catch(() => null),
        axios.get(url2).catch(() => null),
        axios.get(url3).catch(() => null)
      ]);

      const sim = r1?.data;
      const nadra = r2?.data;
      const land = r3?.data;

      let out = "🆔 CNIC REPORT\n━━━━━━━━━━━━━━\n\n";

      // SIM
      if (sim?.success) {
        out += "📱 SIM RECORDS\n";
        sim.data.records.forEach((r, i) => {
          out += `${i + 1}. ${r.full_name} | ${r.phone}\n`;
        });
        out += "\n";
      }

      // NADRA
      const nadraOut = parseNadra(nadra, text);
      out += nadraOut ? nadraOut + "\n" : "🟢 NADRA: No Data\n\n";

      // LAND
      const landOut = parseLand(land, text);
      out += landOut ? landOut : "🏠 LAND: No Data\n\n";

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
