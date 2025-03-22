// routes/telegram.js
import express from 'express';
import axios from 'axios';
const router = express.Router();

// ✅ อ่านค่าจาก .env
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

// ✅ URL สำหรับส่งข้อความกลับ Telegram และเรียก Together AI
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const TOGETHER_API = "https://api.together.xyz/v1/chat/completions";

// ✅ Endpoint ที่ Telegram จะยิงเข้ามาเมื่อมีข้อความใหม่
router.post('/telegram', async (req, res) => {
  const message = req.body.message;

  // ✅ ข้ามถ้าไม่ใช่ข้อความ text
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text;

  try {
    // ✅ 1. ส่งข้อความจาก Telegram ไปยัง Together AI
    const aiResponse = await axios.post(TOGETHER_API, {
      model: "mistral-7b-instruct",
      messages: [
        {
          role: "system",
          content: "คุณคือผู้ช่วยของเจ้าของร้าน คอยตอบคำถามลูกค้าเกี่ยวกับสินค้า ออเดอร์ และการจัดการร้าน"
        },
        {
          role: "user",
          content: userText
        }
      ]
    }, {
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const aiReply = aiResponse.data.choices?.[0]?.message?.content || "ขออภัย ระบบไม่สามารถตอบกลับได้ในขณะนี้ค่ะ";

    // ✅ 2. ส่งข้อความตอบกลับไปยัง Telegram
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: aiReply
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

export default router;
