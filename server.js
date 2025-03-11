import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cores from "cors";
import passport from "passport";
import authRoutes from "./routes/auth.js";

import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";

dotenv.config();

const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cores());
app.use(passport.initialize());

// เชื่อม MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ใช้ Routes
app.use("/api/products", productRoutes);
app.use("/api", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", orderRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
