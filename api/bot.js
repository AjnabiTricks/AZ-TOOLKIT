const axios = require("axios");

// 🔐 BOT TOKEN (DIRECT IN FILE)
const TOKEN = "8914391257:AAFl77h8xT015qTcJy0zHuq9xQPTEW17M6I";
const API = `https://api.telegram.org/bot${TOKEN}`;

// 👑 ADMINS
const ADMIN_IDS = [
  6581234524,
  7133052934,
  6343143457
];

function isAdmin(id) {
  return ADMIN_IDS.includes(Number(id));
}

// 👥 TEMP USER STORE
const USERS = new Set();

module.exports = async (req, res) => {
  try {

    let body = req.body;
    if (!body) return res.status(200).send("OK");
    if (typeof body === "string") body = JSON.parse(body);

    const msg = body.message;
    if (!msg || !msg.text) return res.status(200).send("OK");

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // 👥 STORE USER
    USERS.add(msg.from.id);

    // 🔹 START
    if (text === "/start") {
      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome!\nBot is working perfectly."
      });

      return res.status(200).send("OK");
    }

    // 👑 ADMIN PANEL
    if (text === "/admin") {

      if (!isAdmin(msg.from.id)) {
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Access Denied"
        });

        return res.status(200).send("OK");
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👑 ADMIN PANEL

📊 /users
ℹ️ /status`
      });

      return res.status(200).send("OK");
    }

    // 👥 USER COUNT
    if (text === "/users") {

      if (!isAdmin(msg.from.id)) {
        return res.status(200).send("OK");
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👥 Total Users (Session): ${USERS.size}`
      });

      return res.status(200).send("OK");
    }

    // ℹ️ STATUS
    if (text === "/status") {

      if (!isAdmin(msg.from.id)) {
        return res.status(200).send("OK");
      }

      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "✅ Bot Status: Running on Vercel"
      });

      return res.status(200).send("OK");
    }

    return res.status(200).send("OK");

  } catch (e) {
    console.log(e);
    return res.status(200).send("OK");
  }
};    USERS.add(msg.from.id);

    // 🔹 START
    if (text === "/start") {
      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome!\nBot is running successfully."
      });
    }

    // 👑 ADMIN PANEL
    if (text === "/admin") {

      if (!isAdmin(msg.from.id)) {
        return axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Access Denied"
        });
      }

      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👑 ADMIN PANEL

📊 /users
ℹ️ Bot Status: Online`
      });
    }

    // 👥 USER COUNT
    if (text === "/users") {

      if (!isAdmin(msg.from.id)) {
        return res.status(200).send("OK");
      }

      return axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `👥 Total Users (Session): ${USERS.size}`
      });
    }

    return res.status(200).send("OK");

  } catch (e) {
    console.log(e);
    return res.status(200).send("OK");
  }
};
