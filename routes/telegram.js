import express from 'express';
import axios from 'axios';
import Product from '../models/Product.js';

const router = express.Router();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const TOGETHER_API = "https://api.together.xyz/v1/chat/completions";

// ฟังก์ชันช่วยกรองสินค้าตาม keyword เบื้องต้น
const filterProducts = (products, userText) => {
  const keywords = ['คอกลม', 'เสื้อยืด', 'เชิ้ต', 'เดรส', 'ผู้หญิง', 'ผู้ชาย', 'เที่ยว'];
  const lowerText = userText.toLowerCase();
  return products.filter(p =>
    keywords.some(k => lowerText.includes(k)) &&
    (p.name.toLowerCase().includes(lowerText) || p.description.toLowerCase().includes(lowerText))
  );
};

router.post('/telegram', async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text;

  try {
    const allProducts = await Product.find({ status: 'available' });

    // กรองสินค้าตามคำถามของลูกค้าแบบเบื้องต้น
    const matchedProducts = filterProducts(allProducts, userText);
    const productsToShow = matchedProducts.slice(0, 5);

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

    // แจ้งจำนวนสินค้าที่ยังไม่ได้แสดง
    const remainingCount = matchedProducts.length - productsToShow.length;
    const note = remainingCount > 0
      ? `\n\n🔎 ยังมีสินค้าอีก ${remainingCount} รายการที่เกี่ยวข้อง หากต้องการดูเพิ่มเติม โปรดเข้าเว็บไซต์ของเรา: https://evolve-shop.vercel.app/`
      : '';

      const systemPrompt = `
      คุณคือแอดมินของร้านค้าออนไลน์ชื่อ "Evolve Shop" ทำหน้าที่ตอบคำถามเกี่ยวกับสินค้าเสื้อผ้าให้ลูกค้าอย่างสุภาพและแม่นยำ
      
      🔐 กฎสำคัญในการตอบ:
      - ห้ามสร้างหรือเดาข้อมูลที่ไม่มีอยู่จริงเด็ดขาด
      - ให้ตอบเฉพาะจากข้อมูลรายการสินค้าที่แสดงไว้ด้านล่างเท่านั้น
      - ถ้าสินค้าไม่ตรงกับคำถาม ให้บอกลูกค้าว่า “ไม่มีสินค้า” หรือแนะนำให้ดูเพิ่มเติมที่เว็บไซต์
      - ห้ามสรุปว่ามีสินค้าในสีหรือไซส์ใดๆ ถ้าไม่มีในรายการด้านล่าง
      - ห้ามใช้ภาษาคลุมเครือ เช่น “น่าจะมี”, “อาจจะมี” หรือ “มีหลายสี”
      
      📌 ลูกค้าอาจถามถึง:
      - สินค้าที่มีสีหรือไซส์เฉพาะ
      - ราคาประมาณที่ต้องการ
      - ประเภทเสื้อผ้า เช่น เสื้อคอกลม, เสื้อเชิ้ต, เสื้อใส่เที่ยว
      - คำแนะนำเรื่องสไตล์ หรือไซส์ที่เหมาะสม
      
      📦 รายการสินค้า:
      ${productDetailsList}${note}
      
      📝 หมายเหตุ:
      หากลูกค้าต้องการดูรูปภาพสินค้าเพิ่มเติม ให้แนะนำให้ไปที่เว็บไซต์: https://evolve-shop.vercel.app/
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
