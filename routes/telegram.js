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

คุณสามารถเรียกฟังก์ชันชื่อ \"sendProductImages\" เมื่อคุณต้องการให้ระบบส่งภาพสินค้าให้ลูกค้า
`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ];

    const aiResponse = await axios.post(TOGETHER_API, {
      model: "meta-llama/Llama-Vision-Free",
      messages,
      functions: [
        {
          name: "sendProductImages",
          description: "ส่งภาพสินค้าให้ลูกค้า",
          parameters: {
            type: "object",
            properties: {
              productNames: {
                type: "array",
                items: { type: "string" },
                description: "ชื่อสินค้าที่ต้องการส่งภาพให้ลูกค้า"
              }
            },
            required: ["productNames"]
          }
        }
      ]
    }, {
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const choice = aiResponse.data.choices[0];
    const functionCall = choice.message?.function_call;

    if (functionCall?.name === "sendProductImages") {
      const args = JSON.parse(functionCall.arguments);
      const selectedNames = args.productNames || [];
      const selectedProducts = products.filter(p => selectedNames.includes(p.name));

      for (const p of selectedProducts) {
        if (p.images?.length > 0) {
          await axios.post(`${TELEGRAM_API}/sendPhoto`, {
            chat_id: chatId,
            photo: p.images[0],
            caption: `${p.name} - ${p.price} บาท\nคงเหลือ: ${p.stock} ชิ้น`
          });
        }
      }
    }

    let aiReply = choice.message?.content?.trim();
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
