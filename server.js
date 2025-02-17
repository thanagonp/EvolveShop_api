import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Together } from "together-ai";

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY, // ต้องตั้งค่า API Key ในไฟล์ .env
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo-128K",
      messages: [{ role: "user", content: message }],
      max_tokens: 200, // ค่าจำกัดคำตอบ
      temperature: 0.7, // ค่าความ random ของ output
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1,
      stream: false, // ถ้าต้องการ Stream output เปลี่ยนเป็น true
    });

    res.json(response.choices[0].message); // ส่งผลลัพธ์กลับไปยัง frontend
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "API Error", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
