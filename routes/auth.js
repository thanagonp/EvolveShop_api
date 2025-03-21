import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!TELEGRAM_BOT_TOKEN) console.error("❌ Missing TELEGRAM_BOT_TOKEN in .env");
if (!FRONTEND_BASE_URL) console.error("❌ Missing FRONTEND_BASE_URL in .env");
if (!JWT_SECRET) console.error("❌ Missing JWT_SECRET in .env");

const verifyTelegramAuth = (query) => {
    try {
        if (!query || Object.keys(query).length === 0) {
            console.error("❌ No data received from Telegram.");
            return false;
        }

        console.log("🔍 Received Telegram Query:", query);

        const authData = { ...query };
        const checkHash = authData.hash;

        if (!checkHash) {
            console.error("❌ Missing hash in Telegram data.");
            return false;
        }

        delete authData.hash;

        if (!authData.auth_date) {
            console.error("❌ Missing auth_date in Telegram data.");
            return false;
        }

        const dataString = Object.keys(authData)
            .sort()
            .map((key) => `${key}=${authData[key]}`)
            .join("\n");

        const secretKey = crypto.createHash("sha256").update(TELEGRAM_BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataString).digest("hex");

        return calculatedHash === checkHash;
    } catch (error) {
        console.error("❌ Error verifying Telegram auth:", error);
        return false;
    }
};

router.post("/telegram/callback", async (req, res) => {
    try {
        const { tgAuthResult } = req.body;

        if (!tgAuthResult) {
            return res.status(400).json({ success: false, message: "❌ Missing tgAuthResult" });
        }

        console.log("🔍 Received Telegram Auth Result:", tgAuthResult);

        // ✅ ทำการ Verify ข้อมูลจาก Telegram
        const userData = JSON.parse(Buffer.from(tgAuthResult, "base64").toString("utf-8"));
        console.log("✅ Decoded Telegram Data:", userData);

        const { id, first_name, last_name, username, photo_url } = userData;

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

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

        return res.json({ success: true, token });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ success: false, message: "❌ Server Error", error });
    }
});


export default router;
