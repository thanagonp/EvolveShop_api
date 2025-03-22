// routes/telegram.js
import express from 'express';
import axios from 'axios';
import Product from '../models/Product.js'; 
const router = express.Router();

// ✅ อ่านค่าจาก .env
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

// ✅ URL สำหรับส่งข้อความกลับ Telegram และเรียก Together AI
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const TOGETHER_API = "https://api.together.xyz/v1/chat/completions";

router.post('/telegram', async (req, res) => {
    const message = req.body.message;
  
    if (!message || !message.text) return res.sendStatus(200);
  
    const chatId = message.chat.id;
    const userText = message.text;
  
    try {
      // 🟡 1. ดึงข้อมูลสินค้า
      const products = await Product.find({ status: 'available' });
  
      // 🟡 2. สรุปรายการสินค้าเป็นข้อความ
      const productSummary = products.map(p => {
        return `- ${p.name} ราคา ${p.price} บาท คงเหลือ ${p.stock} ชิ้น`;
      }).join('\n');
  
      // 🟡 3. สร้างข้อความ system prompt
      const systemPrompt = `
  คุณคือผู้ช่วยของร้านค้าออนไลน์
  ลูกค้าจะพิมพ์คำถามเกี่ยวกับสินค้า ให้ตอบโดยอิงจากรายการสินค้าที่ร้านมีอยู่ในระบบด้านล่างนี้
  
  รายการสินค้า:
  ${productSummary}
  `;
  
      // 🟡 4. ส่งให้ Together AI
      const aiResponse = await axios.post(TOGETHER_API, {
        model: "meta-llama/Llama-Vision-Free", // ✅ หรือ model ที่คุณเลือก
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ]
      }, {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json"
        }
      });
  
      const aiReply = aiResponse.data.choices[0].message.content;
  
      // 🟡 5. ส่งกลับ Telegram
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

export default router;
