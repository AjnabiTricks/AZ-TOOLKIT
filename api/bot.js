const axios = require("axios");
const { MongoClient } = require("mongodb");

// 🔐 ENV
const TOKEN = process.env.8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I;
const MONGO_URI = process.env.mongodb+srv://AZ-TOOLKIT:aztoolkit123@cluster0.zicnsz9.mongodb.net/?appName=Cluster0;
const API = `https://api.telegram.org/bot${TOKEN}`;

// 👑 ADMINS
const ADMIN_IDS = [
  6581234524,
  7133052934,
  6343143457
];

function isAdmin(userId) {
  return ADMIN_IDS.includes(Number(userId));
}

// 🟢 MongoDB Client
const client = new MongoClient(MONGO_URI);

async function getDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  return client.db("telegram_bot");
}

// 🚀 MAIN HANDLER
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

    const db = await getDB();
    const users = db.collection("users");

    // 👥 SAVE USER
    await users.updateOne(
      { userId },
      {
        $set: {
          userId,
          username: msg.from.username || "",
          first_name: msg.from.first_name || "",
          last_seen: new Date()
        }
      },
      { upsert: true }
    );

    // 🔹 START
    if (text === "/start") {
      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome!\nSend CNIC or Mobile Number"
      });
    }

    // 👑 ADMIN PANEL
    if (text === "/admin") {
      if (!isAdmin(userId)) {
        return res.status(200).send("OK");
      }

      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👑 ADMIN PANEL

📊 /stats
👥 /users`
      });
    }

    // 📊 STATS
    if (text === "/stats") {
      if (!isAdmin(userId)) return res.status(200).send("OK");

      const count = await users.countDocuments();

      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `📊 BOT STATS

👥 Users: ${count}
🚀 Status: Running`
      });
    }

    // 👥 USERS COUNT
    if (text === "/users") {
      if (!isAdmin(userId)) return res.status(200).send("OK");

      const count = await users.countDocuments();

      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👥 Total Users: ${count}`
      });
    }

    // 🆔 CNIC SEARCH
    if (/^\d{13}$/.test(text)) {

      const url = `https://famofc.site/api/database.php/?q=${text}`;
      const resp = await axios.get(url);
      const data = resp.data;

      if (!data.success) {
        return axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "❌ No record found"
        });
      }

      let out = "🆔 CNIC RESULT\n\n";

      data.data.records.forEach((r, i) => {
        out += `Record ${i + 1}\n`;
        out += `Name: ${r.full_name}\n`;
        out += `Phone: ${r.phone}\n`;
        out += `CNIC: ${r.cnic}\n`;
        out += `Address: ${r.address}\n\n`;
      });

      out += `━━━━━━━━━━━━━━\n📢 WhatsApp Channel:\nhttps://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D`;

      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: out
      });
    }

    // 📱 PHONE SEARCH
    if (/^\d{10,11}$/.test(text)) {

      const phone = text.startsWith("0") ? text : "0" + text;

      const url = `https://famofc.site/api/database.php/?q=${phone}`;
      const resp = await axios.get(url);
      const data = resp.data;

      if (!data.success) {
        return axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "❌ No record found"
        });
      }

      let out = "📱 PHONE RESULT\n\n";

      data.data.records.forEach((r, i) => {
        out += `Record ${i + 1}\n`;
        out += `Name: ${r.full_name}\n`;
        out += `Phone: ${r.phone}\n`;
        out += `CNIC: ${r.cnic}\n`;
        out += `Address: ${r.address}\n\n`;
      });

      out += `━━━━━━━━━━━━━━\n📢 WhatsApp Channel:\nhttps://whatsapp.com/channel/0029VbCnO7n17EmtsCYqkD2D`;

      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: out
      });
    }

    return res.status(200).send("OK");

  } catch (e) {
    console.log(e);
    return res.status(200).send("OK");
  }
};
