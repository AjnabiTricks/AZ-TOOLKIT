const axios = require("axios");

const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

const ADMIN_IDS = [6581234524, 7133052934, 6343143457];
const CHANNELS = ["@AZ_Tricks", "@Hacking_Tricks0", "@a2z_hacking"];

const USERS = new Set();
const JOIN_CACHE = new Map(); // userId -> timestamp

function isAdmin(id) {
  return ADMIN_IDS.includes(Number(id));
}

// ================= FAST REQUEST =================
const http = axios.create({
  timeout: 6000
});

// ================= JOIN CACHE (24h) =================
async function checkJoin(userId) {
  const cached = JOIN_CACHE.get(userId);
  if (cached && Date.now() - cached < 86400000) return true;

  try {
    for (const ch of CHANNELS) {
      const res = await http.get(
        `${API}/getChatMember?chat_id=${ch}&user_id=${userId}`
      );

      const status = res.data.result.status;
      if (!["member", "creator", "administrator"].includes(status)) {
        return false;
      }
    }

    JOIN_CACHE.set(userId, Date.now());
    return true;
  } catch {
    return false;
  }
}

// ================= TELEGRAM =================
async function send(chatId, text) {
  return http.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text
  });
}

async function del(chatId, id) {
  try {
    await http.post(`${API}/deleteMessage`, {
      chat_id: chatId,
      message_id: id
    });
  } catch {}
}

// ================= FORMATTERS =================
function simFormat(d) {
  if (!d?.success) return "📱 SIM: No Data\n";
  return "📱 SIM OK\n" + d.data.records.map(r =>
    `\n${r.full_name} | ${r.phone} | ${r.cnic} | ${r.address}\n`
  ).join("\n----------------\n");
}

function nadraFormat(d) {
  const arr = Array.isArray(d) ? d : [];
  if (!arr.length) return "🟢 NADRA: No Data\n";

  return "🟢 NADRA OK\n" + arr.map(r =>
    `\n${r.NAME} | ${r.IDENTIFICATION_NO}\n${r.PRESENT_ADDRESS}\n${r.PERMANANT_ADDRESS}\n${r.STATUS}\n`
  ).join("\n----------------\n");
}

function landFormat(d) {
  const hits = d?.data?.responses?.[0]?.hits?.hits || [];
  if (!hits.length) return "🏠 LAND: No Data\n";

  return "🏠 LAND OK\n" + hits.map(h => {
    const s = h._source;
    return `
${s.RegisteredNumber} | ${s.PropertyNumber}
${s.RegistryDate} | ${s.Tehsil}
${s.Address} | ${s.Area} | ${s.RegistryValue}

PARTIES:
${(s.RegistryParties || []).map(p => `- ${p.Name} | ${p.CNIC}`).join("\n")}
`;
  }).join("\n----------------\n");
}

// ================= MAIN =================
module.exports = async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const msg = body.message;
    if (!msg?.text) return res.end("OK");

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const userId = msg.from.id;

    USERS.add(userId);

    const joined = await checkJoin(userId);
    if (!joined && text !== "/start") {
      await send(chatId, "⚠️ Join required");
      return res.end("OK");
    }

    // ================= CNIC =================
    if (/^\d{13}$/.test(text)) {
      const cnic = text;

      const loading = await send(chatId, "🔍 Searching...");
      const loadId = loading.data.result.message_id;

      // FAST PARALLEL FETCH
      const url1 = `https://famofc.site/api/database.php/?q=${cnic}`;
      const url2 = `https://asadmughalfoundation.online/adr/api.php?cnic=${cnic}`;
      const url3 = `https://vercel-api-livid-tau.vercel.app/api/proxy?cnic=${cnic}`;

      const [sim, nadra] = await Promise.all([
        http.get(url1).catch(() => null),
        http.get(url2).catch(() => null)
      ]);

      await del(chatId, loadId);

      // STEP 1 RESULT FAST
      await send(
        chatId,
        `🆔 CNIC: ${cnic}\n\n` +
        simFormat(sim?.data) +
        "\n" +
        nadraFormat(nadra?.data)
      );

      // LAND ASYNC (NO WAIT BLOCK)
      setTimeout(async () => {
        const landMsg = await send(chatId, "⏳ Land loading...");
        const landId = landMsg.data.result.message_id;

        const land = await http.get(url3).catch(() => null);

        await del(chatId, landId);

        await send(
          chatId,
          `🆔 CNIC: ${cnic}\n\n` +
          landFormat(land?.data)
        );
      }, 200);

      return res.end("OK");
    }

    return res.end("OK");

  } catch (e) {
    console.log(e);
    return res.end("OK");
  }
};
