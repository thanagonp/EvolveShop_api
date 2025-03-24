import express from 'express';
import axios from 'axios';
import * as fuzz from 'fuzzball';
import Product from '../models/Product.js';

const router = express.Router();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const TOGETHER_API = "https://api.together.xyz/v1/chat/completions";

const TRIGGER_KEYWORDS = [
  'แนะนำ', 'ดูสินค้า', 'ภาพ', 'ตัวอย่าง', 'เหมาะ', 'แบบไหนดี', 'งบ', 'ไม่เกิน', 'ถูกสุด', 'เลือกให้หน่อย'
];

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
    const products = await Product.find({ status: 'available' });

    const productSummary = products.map(p => (
      `- ${p.name} ราคา ${p.price} บาท คงเหลือ ${p.stock} ชิ้น`
    )).join('\n');

    const matchedProduct = findBestMatchingProduct(products, userText);

    const systemPrompt = `
คุณคือแอดมินร้านค้าออนไลน์ชื่อ \"Evolve Shop\" มีหน้าที่ช่วยตอบคำถามลูกค้าอย่างสุภาพ เป็นกันเอง ให้ข้อมูลถูกต้อง

ร้านมีสินค้าเหล่านี้ในระบบ:
${productSummary}

${matchedProduct ? `
🔎 สินค้าที่ลูกค้าสนใจตอนนี้:
- ชื่อสินค้า: ${matchedProduct.name}
- ราคา: ${matchedProduct.price} บาท
- คงเหลือ: ${matchedProduct.stock} ชิ้น
- สี: ${matchedProduct.color || 'ไม่มีข้อมูล'}
- ไซซ์: ${Array.isArray(matchedProduct.size) ? matchedProduct.size.join(', ') : matchedProduct.size || 'ไม่มีข้อมูล'}
- หมวดหมู่: ${matchedProduct.category || 'ไม่ระบุ'}` : ''}

📌 คุณสามารถช่วยลูกค้าได้ดังนี้:
- แนะนำสินค้าในร้าน
- แจ้งรายละเอียดสินค้าที่ลูกค้าสนใจ
- เปรียบเทียบหรือช่วยเลือกสินค้า
- ตอบคำถามสั้น กระชับ เข้าใจง่าย

หากลูกค้าถามข้อมูลที่ไม่มีในระบบ ให้ตอบสุภาพว่าไม่มีข้อมูลดังกล่าว`;

    const shouldSendImages = TRIGGER_KEYWORDS.some(keyword =>
      userText.toLowerCase().includes(keyword)
    );

    if (shouldSendImages) {
      const imagesToSend = matchedProduct
        ? [matchedProduct, ...products.filter(p => p._id !== matchedProduct._id).slice(0, 2)]
        : products.slice(0, 3);

      for (const p of imagesToSend) {
        if (p.images?.length > 0) {
          await axios.post(`${TELEGRAM_API}/sendPhoto`, {
            chat_id: chatId,
            photo: p.images[0],
            caption: `${p.name} - ${p.price} บาท\nคงเหลือ: ${p.stock} ชิ้น`
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