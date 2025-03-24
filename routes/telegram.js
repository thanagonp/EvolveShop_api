import express from 'express';
import axios from 'axios';
import Product from '../models/Product.js';

const router = express.Router();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const TOGETHER_API = "https://api.together.xyz/v1/chat/completions";

const TRIGGER_KEYWORDS = [
  'แนะนำ', 'ดูสินค้า', 'ภาพ', 'ตัวอย่าง', 'เหมาะ', 'แบบไหนดี', 'งบ', 'ไม่เกิน', 'ถูกสุด', 'เลือกให้หน่อย'
];

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

📝 สิ่งที่คุณสามารถช่วยได้:
- แนะนำว่าสินค้ามีอะไรบ้าง
- รายละเอียดของสินค้าแต่ละตัว เช่น ราคา คงเหลือ สี ไซซ์
- ช่วยเลือกระหว่างสินค้าหลายชิ้น
- ตอบคำถามสั้น กระชับ ชัดเจน เข้าใจง่าย
หากลูกค้าถามข้อมูลที่ไม่มีในระบบ ให้ตอบสุภาพว่าไม่มีข้อมูลดังกล่าว`;

    // ฟังก์ชันช่วยหาจำนวนที่ลูกค้าต้องการดู
function extractRequestedAmount(text) {
  const match = text.match(/(\\d+)[\\s]*ชิ้น|แนะนำ[\\s]*สินค้า[\\s]*(\\d+)/i);
  return match ? parseInt(match[1] || match[2]) : null;
}

const shouldSendImages = TRIGGER_KEYWORDS.some(keyword =>
  userText.toLowerCase().includes(keyword)
);

const requestedAmount = extractRequestedAmount(userText);

if (shouldSendImages) {
  let imagesToSend = [...products];

  // ถ้ามีการระบุจำนวน ให้จำกัดตามนั้น
  if (requestedAmount && requestedAmount > 0) {
    imagesToSend = imagesToSend.slice(0, requestedAmount);
  } else {
    imagesToSend = imagesToSend.slice(0, 3); // default
  }

  for (const p of imagesToSend) {
    if (p.images?.length > 0) {
      await axios.post(`${TELEGRAM_API}/sendPhoto`, {
        chat_id: chatId,
        photo: p.images[0],
        caption: `${p.name} - ${p.price} บาท\\nคงเหลือ: ${p.stock} ชิ้น`
      });
    }
  }
}


    const aiResponse = await axios.post(TOGETHER_API, {
      model: "meta-llama/Llama-Vision-Free",
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
