import express from 'express';
import axios from 'axios';
import fuzz from 'fuzzball';
import Product from '../models/Product.js';

const router = express.Router();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const TOGETHER_API = "https://api.together.xyz/v1/chat/completions";

// 🔍 คีย์เวิร์ดที่สื่อว่าอยากดูภาพ
const TRIGGER_KEYWORDS = [
  'แนะนำ', 'ดูสินค้า', 'ภาพ', 'ตัวอย่าง', 'เหมาะ', 'แบบไหนดี', 'งบ', 'ไม่เกิน', 'ถูกสุด', 'เลือกให้หน่อย'
];

// 🔍 ฟังก์ชันจับสินค้าที่ user อาจหมายถึง ด้วย fuzzball
function findBestMatchingProduct(products, userText) {
  const productNames = products.map(p => p.name);
  const result = fuzz.extract(userText, productNames, {
    scorer: fuzz.token_set_ratio,
    returnObjects: true
  });

  const bestMatch = result[0];
  if (bestMatch && bestMatch.score >= 70) {
    return products.find(p => p.name === bestMatch.string);
  }

  return null;
}

router.post('/telegram', async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text;

  try {
    // 1. ดึงสินค้าทั้งหมด
    const products = await Product.find({ status: 'available' });

    // 2. สรุปรายการสินค้า
    const productSummary = products.map(p => (
      `- ${p.name} ราคา ${p.price} บาท คงเหลือ ${p.stock} ชิ้น`
    )).join('\n');

    // 3. ตรวจจับสินค้าที่ user อาจพูดถึง
    const matchedProduct = findBestMatchingProduct(products, userText);
    let productDetails = '';

    if (matchedProduct) {
      productDetails = `
ลูกค้ากำลังถามถึงสินค้า: ${matchedProduct.name}

รายละเอียดสินค้า:
- ราคา: ${matchedProduct.price} บาท
- คงเหลือ: ${matchedProduct.stock} ชิ้น
- สี: ${matchedProduct.color || 'ไม่มีข้อมูล'}
- ไซซ์: ${Array.isArray(matchedProduct.size) ? matchedProduct.size.join(', ') : matchedProduct.size || 'ไม่มีข้อมูล'}
- หมวดหมู่: ${matchedProduct.category || 'ไม่ระบุ'}
      `;
    }

    // 4. สร้าง system prompt
    const systemPrompt = `
คุณคือแอดมินร้านค้าออนไลน์ชื่อ "Evolve Shop" มีหน้าที่ช่วยตอบคำถามลูกค้าอย่างสุภาพ เป็นกันเอง และให้ข้อมูลที่ถูกต้อง
ข้อมูลสินค้าด้านล่างนี้คือสิ่งที่ร้านมีอยู่ในระบบ ช่วยใช้ข้อมูลนี้ในการตอบคำถามทุกครั้ง และอย่าตอบสิ่งที่ไม่มีอยู่จริง

📦 รายการสินค้า:
${productSummary}

${productDetails}

📌 สิ่งที่คุณสามารถช่วยได้ เช่น:
- แนะนำว่าสินค้ามีอะไรบ้าง
- รายละเอียดของสินค้าแต่ละตัว เช่น ราคา คงเหลือ สี ไซซ์
- ช่วยเลือกระหว่างสินค้าหลายชิ้น
- ให้คำตอบสั้น กระชับ ชัดเจน เข้าใจง่าย
    `;

    // 5. เช็กว่าควรส่งภาพไหม
    const shouldSendImages = TRIGGER_KEYWORDS.some(keyword =>
      userText.toLowerCase().includes(keyword)
    );

    if (shouldSendImages) {
      const top3 = products.slice(0, 3);
      for (const p of top3) {
        await axios.post(`${TELEGRAM_API}/sendPhoto`, {
          chat_id: chatId,
          photo: p.images?.[0],
          caption: `${p.name} - ${p.price} บาท\nคงเหลือ: ${p.stock} ชิ้น`
        });
      }
    }

    // 6. ส่งไปหา AI
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

    const aiReply = aiResponse.data.choices[0].message.content;

    // 7. ตอบกลับลูกค้า
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
