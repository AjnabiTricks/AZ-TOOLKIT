const axios = require("axios");

const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

module.exports = async (req, res) => {
  try {

    let body = req.body;

    if (!body) return res.status(200).send("OK");
    if (typeof body === "string") body = JSON.parse(body);

    const msg = body.message;

    // ❌ ignore non-message updates
    if (!msg || !msg.text) {
      return res.status(200).send("OK");
    }

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    console.log("TEXT:", text);

    // ✅ ONLY /start command
    if (text === "/start") {
      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome!\nSend CNIC number (13 digits)"
      });

      return res.status(200).send("OK");
    }

    // ❌ STOP replying to everything else except CNIC
    if (!/^\d{13}$/.test(text)) {
      return res.status(200).send("OK");
    }

    // ✅ CNIC logic
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

    let out = "🔍 RESULT\n\n";

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

  } catch (e) {
    console.log(e);
    return res.status(200).send("OK");
  }
};
