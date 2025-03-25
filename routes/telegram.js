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
    const allProducts = await Product.find({ status: 'available' });
    const productsToShow = allProducts.slice(0, 5);

    const productDetailsList = productsToShow.map(p => {
      return `
🔖 ชื่อสินค้า: ${p.name}
💰 ราคา: ${p.price} บาท
📦 คงเหลือ: ${p.stock} ชิ้น
🎨 สี: ${p.color?.[0] || 'ไม่มีข้อมูล'}
📏 ไซส์: ${p.size?.[0] || 'ไม่มีข้อมูล'}
📝 รายละเอียด: ${p.description || 'ไม่มีข้อมูล'}
🌐 ดูเพิ่มเติม: https://evolve-shop.vercel.app/`;
    }).join('\n\n');

    const remainingCount = allProducts.length - productsToShow.length;
    const note = remainingCount > 0
      ? `\n\n🔎 ยังมีสินค้าอีก ${remainingCount} รายการ หากต้องการดูเพิ่มเติม โปรดเข้าเว็บไซต์ของเรา: https://evolve-shop.vercel.app/`
      : '';

    const systemPrompt = `
คุณคือแอดมินร้านค้าออนไลน์ชื่อ \"Evolve Shop\" ทำหน้าที่ให้ข้อมูลสินค้าเสื้อผ้าแก่ลูกค้าอย่างสุภาพ ชัดเจน และตรงความต้องการ

📝 ข้อมูลสินค้าในร้าน:
${productDetailsList}${note}

❗ ข้อกำหนดสำคัญ:
- ห้ามแต่งเติมหรือเดาข้อมูลที่ไม่มีในรายการสินค้าเด็ดขาด
- ให้ตอบตามข้อมูลจริงที่ได้รับเท่านั้น
- ถ้าคำถามไม่ตรงกับสินค้าใด ให้บอกว่าไม่มีในขณะนี้
- แนะนำให้ลูกค้าเข้าชมเพิ่มเติมที่ https://evolve-shop.vercel.app/ หากต้องการดูรูปภาพหรือรายการทั้งหมด
`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ];

    const aiResponse = await axios.post(TOGETHER_API, {
      model: "meta-llama/Llama-Vision-Free",
      messages,
      temperature: 0.4
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