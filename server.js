import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";  // ✅ แก้ไขชื่อ cores → cors
import passport from "passport";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import telegramRoutes from "./routes/telegram.js";

dotenv.config();  // ✅ โหลด env ก่อนใช้ค่า
const app = express();

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  process.env.FRONTEND_BASE_URL,  // ✅ ใช้ชื่อตัวแปรจาก Render  
  "https://evolve-shop-c4ajmb9bv-thanagons-projects-d215f576.vercel.app"
];

app.use(cors({ origin: "*", credentials: true }));


app.use(passport.initialize());

// ✅ เชื่อม MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/webhook", telegramRoutes);
app.get("/", (req, res) => {
  res.send("Welcome to My Telegram Auth API");
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));

