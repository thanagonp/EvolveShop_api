import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cores from "cors";

import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";

dotenv.config();

const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cores());

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
