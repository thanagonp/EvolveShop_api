// routes/telegram.js
import express from 'express';
const axios = require('axios');
const router = express.Router();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const TOGETHER_API = "https://api.together.xyz/v1/chat/completions";

router.post('/telegram', async (req, res) => {
  const message = req.body.message;

  if (!message || !message.text) return res.sendStatus(200); // ignore non-text

  const chatId = message.chat.id;
  const userText = message.text;

  try {
    // 1. ส่งข้อความไปยัง Together AI
    const aiResponse = await axios.post(TOGETHER_API, {
        model: "meta-llama/Llama-3-3.3-70B-Instruct-Turbo",
        messages: [
          { role: "system", content: "คุณคือผู้ช่วยของเจ้าของร้าน คอยตอบคำถามและช่วยตรวจสอบระบบร้านค้า" },
          { role: "user", content: userText }
        ]
      }, {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json"
        }
      });
      

    const aiReply = aiResponse.data.choices[0].message.content;

    // 2. ตอบกลับ Telegram
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: aiReply
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;
