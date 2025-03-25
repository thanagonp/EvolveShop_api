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
      🔖 ชื่อสินค้า: ${p.name}
      💰 ราคา: ${p.price} บาท
      📦 คงเหลือ: ${p.stock} ชิ้น
      🎨 สี: ${p.color?.[0] || 'ไม่มีข้อมูล'}
      📏 ไซส์: ${p.size?.[0] || 'ไม่มีข้อมูล'}
      📝 รายละเอียด: ${p.description || 'ไม่มีข้อมูล'}
      🌐 ดูเพิ่มเติม: https://evolve-shop.vercel.app/
      `;
      }).join('\n\n');

      const systemPrompt = `
      คุณคือแอดมินของร้านค้าออนไลน์ชื่อ "Evolve Shop" มีหน้าที่ให้ข้อมูลเกี่ยวกับสินค้าเสื้อผ้าแก่ลูกค้าอย่างสุภาพ เป็นกันเอง และแม่นยำ
      
      🔍 ลูกค้าอาจถามถึง:
      - สินค้าที่มีสีหรือไซส์เฉพาะ
      - ราคาประมาณที่ต้องการ
      - ประเภทเสื้อผ้า เช่น เสื้อคอกลม, เสื้อเชิ้ต, เสื้อใส่เที่ยว
      - ข้อแนะนำเรื่องการเลือกไซส์ หรือสไตล์
      
      📦 รายละเอียดสินค้าทั้งหมด:
      ${productDetailsList}
      
      📝 คำแนะนำเพิ่มเติม:
      - ถ้าสินค้าไม่ตรงตามที่ลูกค้าต้องการ ให้แนะนำสินค้าที่ใกล้เคียง
      - ถ้าลูกค้าขอดูรูปภาพ ให้แนะนำไปยังเว็บไซต์: https://evolve-shop.vercel.app/
      - ห้ามแต่งข้อมูลหรือให้ข้อมูลที่ไม่มีอยู่จริงเด็ดขาด
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
