import express from 'express';
import axios from 'axios';
import Product from '../models/Product.js';

const router = express.Router();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const TOGETHER_API = "https://api.together.xyz/v1/chat/completions";

router.post('/telegram', async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text;

  try {
    const products = await Product.find({ status: 'available' });

    const productDetailsList = products.map(p => {
      return `
📌 ชื่อสินค้า: ${p.name}
- ราคา: ${p.price} บาท
- คงเหลือ: ${p.stock} ชิ้น
- สี: ${p.color || 'ไม่มีข้อมูล'}
- ไซซ์: ${Array.isArray(p.size) ? p.size.join(', ') : p.size || 'ไม่มีข้อมูล'}
- หมวดหมู่: ${p.category || 'ไม่ระบุ'}
`;
    }).join('\n');

    const systemPrompt = `
คุณคือแอดมินร้านค้าออนไลน์ชื่อ \"Evolve Shop\" มีหน้าที่ช่วยตอบคำถามลูกค้าอย่างสุภาพ เป็นกันเอง และให้ข้อมูลถูกต้อง

📦 รายละเอียดสินค้าทั้งหมดในระบบ:
${productDetailsList}

ลูกค้าสามารถดูภาพสินค้าและข้อมูลเพิ่มเติมได้ที่เว็บไซต์ของร้าน: https://evolve-shop.com

โปรดอย่าตอบสิ่งที่ไม่มีอยู่จริง และหากลูกค้าต้องการดูรูปภาพสินค้า ให้แนะนำให้เข้าเว็บไซต์ร้านค้า
`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ];

    const aiResponse = await axios.post(TOGETHER_API, {
      model: "meta-llama/Llama-Vision-Free",
      messages
    }, {
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    let aiReply = aiResponse.data.choices[0].message.content.trim();
    if (!aiReply) {
      aiReply = 'ขออภัยค่ะ ตอนนี้ระบบมีปัญหาในการตอบกลับ โปรดติดต่อแอดมินโดยตรง';
    }

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
