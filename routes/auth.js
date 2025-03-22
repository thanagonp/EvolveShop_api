import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

if (!TELEGRAM_BOT_TOKEN) console.error("❌ Missing TELEGRAM_BOT_TOKEN in .env");
if (!JWT_SECRET) console.error("❌ Missing JWT_SECRET in .env");

// ✅ API สำหรับ Login ผ่าน Telegram Widget
router.post("/telegram/login", async (req, res) => {
    try {
      const { id, first_name, last_name, username, photo_url } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, message: "❌ Invalid Telegram Data" });
      }
  
      let user = await User.findOne({ telegramId: id });
  
      if (!user) {
        user = new User({
          telegramId: id,
          name: `${first_name} ${last_name || ""}`.trim(),
          username: username || `user_${id}`,
          photo: photo_url || "https://via.placeholder.com/150",
          role: "customer",
        });
        await user.save();
        console.log("✅ New user created:", user);
      }
  
      const token = jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
  
      // ✅ เพิ่ม URL ที่ต้องการ Redirect หลังจาก Login
      res.json({ success: true, token, redirectUrl: "/customer/store" });
  
    } catch (error) {
      console.error("❌ Server Error:", error);
      res.status(500).json({ success: false, message: "❌ Server Error", error });
    }
  });
  
export default router;
