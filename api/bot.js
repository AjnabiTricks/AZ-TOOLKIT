const axios = require("axios");

const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

module.exports = async (req, res) => {
  try {
    const body = req.body;

    if (!body || !body.message) {
      return res.status(200).send("OK");
    }

    const msg = body.message;
    const chatId = msg.chat.id;

    await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text: "✅ Bot working on Vercel"
    });

    return res.status(200).send("OK");

  } catch (e) {
    return res.status(200).send("ERROR");
  }
};
