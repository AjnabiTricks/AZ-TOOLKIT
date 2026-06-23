const axios = require("axios");
const PDFKit = require("pdfkit");
const fs = require("fs");

// 🔐 BOT TOKEN
const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

// 👑 ADMINS
const ADMIN_IDS = [6581234524, 7133052934, 6343143457];

// 👥 USERS CACHE
const USERS = new Set();

// 📢 CHANNELS
const CHANNELS = ["@AZ_Tricks", "@Hacking_Tricks0", "@a2z_hacking"];

/* ================= JOIN CHECK ================= */

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

/* ================= TEMP MESSAGE (AUTO DELETE) ================= */

async function sendTemp(chatId, text) {
  const res = await axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text
  });

  const msgId = res.data.result.message_id;

  setTimeout(() => {
    axios.post(`${API}/deleteMessage`, {
      chat_id: chatId,
      message_id: msgId
    }).catch(() => {});
  }, 3000);
}

/* ================= FORMAT SIM ================= */

function formatSIM(data) {
  if (!data?.success) return "📱 SIM: No Record Found\n\n";

  let out = "📱 SIM RECORDS\n━━━━━━━━━━━━━━\n";

  data.data.records.forEach((r, i) => {
    out += `\nRecord #${i + 1}\n`;
    out += `Name: ${r.full_name || "N/A"}\n`;
    out += `Mobile: ${r.phone || "N/A"}\n`;
    out += `CNIC: ${r.cnic || "N/A"}\n`;
    out += `Address: ${r.address || "N/A"}\n`;
    out += `━━━━━━━━━━━━━━`;
  });

  return out + "\n\n";
}

/* ================= FORMAT NADRA ================= */

function formatNADRA(data) {
  let arr = Array.isArray(data) ? data : data?.data || [];

  if (!arr.length) return "🟢 NADRA: No Record Found\n\n";

  let out = "🟢 NADRA ADDRESS\n━━━━━━━━━━━━━━\n";

  arr.forEach((r, i) => {
    out += `\nRecord #${i + 1}\n`;
    out += `Name: ${r.NAME || "N/A"}\n`;
    out += `CNIC: ${r.IDENTIFICATION_NO || "N/A"}\n`;
    out += `Present Address: ${r.PRESENT_ADDRESS || "N/A"}\n`;
    out += `Permanent Address: ${r.PERMANANT_ADDRESS || "N/A"}\n`;
    out += `Status: ${r.STATUS || "N/A"}\n`;
    out += `━━━━━━━━━━━━━━`;
  });

  return out + "\n\n";
}

/* ================= FORMAT LAND RECORD ================= */

function formatLAND(data, cnic) {
  const hits = data?.data?.responses?.[0]?.hits?.hits || [];

  if (!hits.length) return "🏠 LAND: No Record Found\n\n";

  let out = "🏠 LAND RECORD\n━━━━━━━━━━━━━━\n";

  hits.forEach((item, i) => {
    const src = item._source;

    out += `\n📌 Record #${i + 1}\n`;
    out += `Registry No: ${src.RegisteredNumber || "N/A"}\n`;
    out += `Property: ${src.PropertyNumber || "N/A"}\n`;
    out += `Date: ${src.RegistryDate || "N/A"}\n`;
    out += `Tehsil: ${src.Tehsil || "N/A"}\n`;
    out += `Address: ${src.Address || "N/A"}\n`;
    out += `Area: ${src.Area || "N/A"}\n`;
    out += `Value: ${src.RegistryValue || "N/A"}\n`;
    out += `Type: ${src.RegistryType || "N/A"}\n\n`;

    out += `👥 Parties:\n`;

    (src.RegistryParties || []).forEach((p, idx) => {
      out += `  ${idx + 1})\n`;
      out += `     Name: ${p.Name || "N/A"}\n`;
      out += `     Father/Spouse: ${p.SpouseName || "N/A"}\n`;
      out += `     CNIC: ${p.CNIC || "N/A"}\n`;
    });

    out += `━━━━━━━━━━━━━━`;
  });

  return out + "\n\n";
}

/* ================= PDF ================= */

function generatePDF(text, cnic) {
  return new Promise((resolve) => {
    const file = `/tmp/${cnic}.pdf`;
    const doc = new PDFKit();

    const stream = fs.createWriteStream(file);
    doc.pipe(stream);

    doc.fontSize(14).text(`CNIC REPORT: ${cnic}`, { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(text);

    doc.end();

    stream.on("finish", () => resolve(file));
  });
}

/* ================= MAIN ================= */

module.exports = async (req, res) => {
  try {
    let body = req.body;
    if (!body) return res.end("OK");
    if (typeof body === "string") body = JSON.parse(body);

    const msg = body.message;
    const cb = body.callback_query;

    /* ================= PDF BUTTON ================= */

    if (cb?.data?.startsWith("pdf_")) {
      const chatId = cb.message.chat.id;
      const cnic = cb.data.replace("pdf_", "");

      await axios.post(`${API}/answerCallbackQuery`, {
        callback_query_id: cb.id,
        text: "Generating PDF..."
      });

      const file = await generatePDF("CNIC REPORT READY", cnic);

      await axios.post(`${API}/sendDocument`, {
        chat_id: chatId,
        document: fs.createReadStream(file),
        caption: `📄 CNIC REPORT\n${cnic}`
      });

      return res.end("OK");
    }

    if (!msg?.text) return res.end("OK");

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const userId = msg.from.id;

    USERS.add(userId);

    const joined = await checkJoin(userId);

    if (!joined && text !== "/start") {
      return sendTemp(chatId, "⚠️ Please join channels first");
    }

    if (text === "/start") {
      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "Send CNIC to search"
      });
    }

    /* ================= CNIC FLOW ================= */

    if (/^\d{13}$/.test(text)) {
      const cnic = text;

      await sendTemp(chatId, "🔍 Searching CNIC...");
      await sendTemp(chatId, "⏳ Fetching Land Record...");

      const [simRes, nadraRes, landRes] = await Promise.all([
        axios.get(`https://famofc.site/api/database.php/?q=${cnic}`).catch(() => null),
        axios.get(`https://asadmughalfoundation.online/adr/api.php?cnic=${cnic}`).catch(() => null),
        axios.get(`https://vercel-api-livid-tau.vercel.app/api/proxy?cnic=${cnic}`).catch(() => null)
      ]);

      const sim = formatSIM(simRes?.data);
      const nadra = formatNADRA(nadraRes?.data);
      const land = formatLAND(landRes?.data, cnic);

      const finalText =
`🆔 CNIC: ${cnic}

${sim}
${nadra}
${land}`;

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: finalText,
        reply_markup: {
          inline_keyboard: [
            [{ text: "📄 Download PDF", callback_data: `pdf_${cnic}` }]
          ]
        }
      });

      return res.end("OK");
    }

    return res.end("OK");
  } catch (e) {
    console.log(e);
    return res.end("OK");
  }
};
