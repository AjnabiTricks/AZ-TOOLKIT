const axios = require("axios");

// 🔐 BOT TOKEN
const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

// 👑 ADMINS
const ADMIN_IDS = [6581234524, 7133052934, 6343143457];

// 👥 USERS (NOTE: RAM only counter, not permanent DB)
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
    text: "⚠️ Bot use karne ke liye tamam channels join karein.",
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

/* =========================
   🔍 LAND RECORD PARSER
========================= */
function parseLand(data, cnic) {
  try {
    const hits =
      data?.data?.responses?.[0]?.hits?.hits || [];

    if (!hits.length) return null;

    let out = `🏠 LAND RECORD FOUND\n\n`;

    hits.forEach((item, i) => {
      const src = item._source;

      out += `📌 Record ${i + 1}\n`;
      out += `🏷 ID: ${src.Id}\n`;
      out += `📄 Registry: ${src.RegisteredNumber}\n`;
      out += `📍 Property: ${src.PropertyNumber || "N/A"}\n`;
      out += `📅 Date: ${src.RegistryDate}\n`;
      out += `🏢 Tehsil: ${src.Tehsil || "N/A"}\n`;
      out += `📌 Address: ${src.Address || "N/A"}\n\n`;

      if (Array.isArray(src.RegistryParties)) {
        out += `👥 Parties:\n`;
        src.RegistryParties.forEach(p => {
          out += `- ${p.Name} (${p.CNIC})\n`;
        });
        out += `\n`;
      }
    });

    return out;
  } catch (e) {
    return null;
  }
}

/* ========================= */

module.exports = async (req, res) => {
  try {
    let body = req.body;
    if (!body) return res.status(200).send("OK");
    if (typeof body === "string") body = JSON.parse(body);

    /* ================= CALLBACK JOIN ================= */
    const callback = body.callback_query;

    if (callback) {
      const userId = callback.from.id;
      const chatId = callback.message.chat.id;

      const joined = await checkJoin(userId);

      if (joined) {
        await axios.post(`${API}/answerCallbackQuery`, {
          callback_query_id: callback.id,
          text: "All channels joined!"
        });

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "👋 Welcome!\nSend CNIC or Mobile Number"
        });
      } else {
        await axios.post(`${API}/answerCallbackQuery`, {
          callback_query_id: callback.id,
          text: "❌ Join channels first",
          show_alert: true
        });
      }

      return res.status(200).send("OK");
    }

    /* ================= MESSAGE ================= */
    const msg = body.message;
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

    /* ================= START ================= */
    if (text === "/start") {
      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome!\nSend CNIC or Mobile Number"
      });
      return res.status(200).send("OK");
    }

    /* ================= ADMIN ================= */
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
        text: `👑 ADMIN PANEL\n\n📊 /stats\n👥 /users`
      });

      return res.status(200).send("OK");
    }

    /* ================= STATS ================= */
    if (text === "/stats") {
      if (!isAdmin(userId)) return res.status(200).send("OK");

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `📊 BOT STATS\n\n👥 Users: ${USERS.size}\n⚡ Active`
      });

      return res.status(200).send("OK");
    }

    /* ================= USERS ================= */
    if (text === "/users") {
      if (!isAdmin(userId)) return res.status(200).send("OK");

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👥 Total Users: ${USERS.size}`
      });

      return res.status(200).send("OK");
    }

    /* ================= PHONE SEARCH ================= */
    if (/^\d{10,11}$/.test(text)) {
      const phone = text.startsWith("0") ? text : "0" + text;

      const url = `https://famofc.site/api/database.php/?q=${phone}`;
      const resp = await axios.get(url).catch(() => null);

      const data = resp?.data;

      if (!data?.success) {
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

      out += FOOTER;

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: out
      });

      return res.status(200).send("OK");
    }

    /* ================= CNIC SEARCH (SIM + LAND FIXED) ================= */
    if (/^\d{13}$/.test(text)) {
      const cnic = text;

      const url1 = `https://famofc.site/api/database.php/?q=${cnic}`;
      const url2 = `https://vercel-api-livid-tau.vercel.app/api/proxy?cnic=${cnic}`;

      const [r1, r2] = await Promise.all([
        axios.get(url1).catch(() => null),
        axios.get(url2).catch(() => null)
      ]);

      const sim = r1?.data;
      const landRaw = r2?.data;

      let out = `🆔 CNIC REPORT\n\n`;

      /* SIM */
      if (sim?.success && sim?.data?.records?.length) {
        out += `📱 SIM DATA\n\n`;
        sim.data.records.forEach((r, i) => {
          out += `Record ${i + 1}\n`;
          out += `Name: ${r.full_name}\n`;
          out += `Phone: ${r.phone}\n`;
          out += `CNIC: ${r.cnic}\n\n`;
        });
      } else {
        out += `📱 SIM DATA: Not Found\n\n`;
      }

      /* LAND FIXED */
      const land = parseLand(landRaw, cnic);

      if (land) {
        out += land;
      } else {
        out += `🏠 LAND RECORD: Not Found\n\n`;
      }

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
