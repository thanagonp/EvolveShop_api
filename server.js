import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";  // ✅ แก้ไขชื่อ cores → cors
import passport from "passport";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";

dotenv.config();  // ✅ โหลด env ก่อนใช้ค่า
const app = express();

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ระบุโดเมนของ Frontend ที่ต้องการอนุญาต
const allowedOrigins = [
  "https://evolve-shop.vercel.app",  // Primary Domain
  "https://evolve-shop-c4ajmb9bv-thanagons-projects-d215f576.vercel.app"  // Custom Deployment
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true  // อนุญาตให้ส่ง Cookie และ Header ที่เกี่ยวข้อง
}));

app.use(passport.initialize());

// ✅ เชื่อม MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.get("/", (req, res) => {
  res.send("Welcome to My Telegram Auth API");
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));

