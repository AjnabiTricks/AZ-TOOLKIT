const axios = require("axios");

// 🔐 BOT TOKEN
const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

// 👑 ADMINS
const ADMIN_IDS = [6581234524, 7133052934, 6343143457];

// 👥 USERS (RAM ONLY)
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
📢 WhatsApp Channel Join:
https://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D
`;

// 📤 SAFE MESSAGE SENDER
async function sendLong(chatId, text) {
  const parts = text.match(/[\s\S]{1,3500}/g) || [];
  for (const p of parts) {
    await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text: p
    });
  }
}

module.exports = async (req, res) => {
  try {
    let body = req.body;
    if (!body) return res.status(200).send("OK");
    if (typeof body === "string") body = JSON.parse(body);

    const msg = body.message;
    const callback = body.callback_query;

    // ================= CALLBACK
    if (callback) {
      const userId = callback.from.id;
      const chatId = callback.message.chat.id;

      const joined = await checkJoin(userId);

      if (joined) {
        await axios.post(`${API}/answerCallbackQuery`, {
          callback_query_id: callback.id,
          text: "✅ Verified"
        });

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "👋 Welcome!\nSend CNIC or Mobile Number"
        });
      } else {
        await axios.post(`${API}/answerCallbackQuery`, {
          callback_query_id: callback.id,
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

    // ================= START
    if (text === "/start") {
      if (!joined) return await sendJoin(chatId);

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome!\nSend CNIC or Mobile Number"
      });

      return res.status(200).send("OK");
    }

    // ================= ADMIN
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
        text: "👑 ADMIN PANEL\n\n📊 /stats\n👥 /users"
      });

      return res.status(200).send("OK");
    }

    // ================= STATS
    if (text === "/stats") {
      if (!isAdmin(userId)) return res.status(200).send("OK");

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `📊 BOT STATS\n\n👥 Users: ${USERS.size}\n⚡ Active`
      });

      return res.status(200).send("OK");
    }

    // ================= USERS
    if (text === "/users") {
      if (!isAdmin(userId)) return res.status(200).send("OK");

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👥 Total Users: ${USERS.size}`
      });

      return res.status(200).send("OK");
    }

    // ================= PHONE SEARCH
    if (/^\d{10,11}$/.test(text)) {
      const phone = text.startsWith("0") ? text : "0" + text;

      const resp = await axios.get(
        `https://famofc.site/api/database.php/?q=${phone}`
      ).catch(() => null);

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
        out += `${i + 1}. ${r.full_name}\n📱 ${r.phone}\n🆔 ${r.cnic}\n📍 ${r.address}\n\n`;
      });

      out += FOOTER;

      await sendLong(chatId, out);
      return res.status(200).send("OK");
    }

    // ================= CNIC FULL (SIM + NADRA + LAND)
    if (/^\d{13}$/.test(text)) {

      const url1 = `https://famofc.site/api/database.php/?q=${text}`;
      const url2 = `https://asadmughalfoundation.online/adr/api.php?cnic=${text}`;

      // LAND RECORD FIXED
      const registryUrl = `https://rodb.pulse.gop.pk/registry_index_3/_msearch`;

      const payload =
        JSON.stringify({ index: "registry_index_3" }) + "\n" +
        JSON.stringify({
          query: {
            bool: {
              must: [
                {
                  nested: {
                    path: "RegistryParties",
                    query: {
                      bool: {
                        must: [
                          {
                            match_phrase: {
                              "RegistryParties.CNIC": text
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          },
          size: 10
        }) + "\n";

      const [r1, r2, r3] = await Promise.all([
        axios.get(url1).catch(() => null),
        axios.get(url2).catch(() => null),
        axios.post(registryUrl, payload, {
          headers: {
            "Authorization": "Basic cmVhZF9vbmx5X3VzZXJfdjI6cmVhZG9ubHlfMTIz",
            "Content-Type": "application/json"
          }
        }).catch(() => null)
      ]);

      const sim = r1?.data;
      const nadra = r2?.data;
      const regHits = r3?.data?.responses?.[0]?.hits?.hits || [];

      let out = "🆔 CNIC FULL REPORT\n\n";

      // SIM
      out += "🔵 SIM DATA\n\n";
      if (sim?.success) {
        sim.data.records.forEach((r) => {
          out += `• ${r.full_name}\n📱 ${r.phone}\n🆔 ${r.cnic}\n📍 ${r.address}\n\n`;
        });
      } else out += "No SIM data\n\n";

      // NADRA
      out += "🟢 NADRA DATA\n\n";
      if (Array.isArray(nadra)) {
        nadra.forEach((r) => {
          out += `• ${r.NAME}\n🆔 ${r.IDENTIFICATION_NO}\n🏠 ${r.PRESENT_ADDRESS}\n\n`;
        });
      } else out += "No NADRA data\n\n";

      // LAND
      out += "🏡 LAND RECORDS\n\n";
      if (!regHits.length) {
        out += "No land record found\n";
      } else {
        regHits.forEach((item, i) => {
          const d = item._source;

          out += `📄 Record ${i + 1}\n`;
          out += `🆔 ${d.Id}\n📜 ${d.RegisteredNumber}\n📍 ${d.Tehsil}\n🏘️ ${d.MauzaName}\n📅 ${d.RegistryDate}\n🏠 ${d.PropertyNumber}\n💰 ${d.RegistryValue}\n\n`;

          (d.RegistryParties || []).forEach((p, j) => {
            out += `   ${j + 1}. ${p.Name} (${p.CNIC})\n`;
          });

          out += "\n━━━━━━━━━━━━━━\n\n";
        });
      }

      out += FOOTER;

      await sendLong(chatId, out);
      return res.status(200).send("OK");
    }

    return res.status(200).send("OK");

  } catch (e) {
    console.log(e);
    return res.status(200).send("OK");
  }
};
