import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import { verifyToken } from "../middleware/verifyToken.js";

dotenv.config();
const router = express.Router();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

if (!TELEGRAM_BOT_TOKEN) console.error("❌ Missing TELEGRAM_BOT_TOKEN in .env");
if (!JWT_SECRET) console.error("❌ Missing JWT_SECRET in .env");

// ✅ Login: ตรวจสอบว่ามี user หรือไม่
router.post("/telegram/login", async (req, res) => {
  try {
    const { id, first_name, last_name, username, photo_url } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "❌ Invalid Telegram Data" });
    }

    let user = await User.findOne({ telegramId: id });

    if (!user) {
      // ยังไม่เคยสมัคร → ส่งข้อมูลกลับไปให้ยืนยันชื่อ
      return res.status(200).json({
        success: true,
        isNew: true,
        tempUser: {
          id,
          first_name,
          last_name,
          username,
          photo_url,
        },
        redirectUrl: "/customer/confirm",
      });
    }

    // user มีอยู่แล้ว → สร้าง token และเข้าสู่ระบบ
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      isNew: false,
      token,
      redirectUrl: "/customer/store",
    });
  } catch (error) {
    console.error("❌ Telegram Login Error:", error);
    res.status(500).json({ success: false, message: "❌ Server Error", error });
  }
});

// ✅ Confirm: บันทึกข้อมูล user ใหม่จาก Telegram
router.post("/telegram/confirm", async (req, res) => {
  try {
    const { id, name, username, photo_url } = req.body;

    if (!id || !name) {
      return res.status(400).json({ success: false, message: "❌ Missing required fields" });
    }

    const existing = await User.findOne({ telegramId: id });
    if (existing) {
      return res.status(400).json({ success: false, message: "❌ User already exists" });
    }

    const user = new User({
      telegramId: id,
      name,
      username: username || `user_${id}`,
      photo: photo_url || "https://via.placeholder.com/150",
      role: "customer",
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      redirectUrl: "/customer/store",
    });
  } catch (error) {
    console.error("❌ Confirm Error:", error);
    res.status(500).json({ success: false, message: "❌ Server Error", error });
  }
});

router.get("/me", verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user, // ใช้ user ที่แนบจาก middleware ได้เลย
  });
});

export default router;
