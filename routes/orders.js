import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";
import mongoose from "mongoose";

const router = express.Router();

// 📌 ตั้งค่า multer ให้รองรับ memoryStorage (ใช้ buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 📌 API: สร้างออเดอร์ใหม่ (รองรับ Transaction)
router.post("/addOrder", upload.single("paymentSlip"), async (req, res) => {
  const session = await mongoose.startSession(); // 🔹 เริ่ม Transaction
  session.startTransaction();

  try {
    console.log("📌 รับข้อมูลจาก Client:", req.body);

    if (!req.file) {
      throw new Error("❌ กรุณาแนบสลิปการชำระเงิน");
    }

    const { customer, items, totalAmount } = req.body;

    // ✅ ตรวจสอบและแปลง JSON
    let parsedCustomer, parsedItems;
    try {
      parsedCustomer = JSON.parse(customer);
      parsedItems = JSON.parse(items).map(item => ({
        product: item.id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        price: item.price
      }));
    } catch (error) {
      throw new Error("❌ ข้อมูล JSON ไม่ถูกต้อง");
    }

    // ✅ อัปโหลดสลิปไปยัง Cloudinary
    let uploadResult;
    try {
      uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "payment_slips" },
          (error, result) => {
            if (error) {
              console.error("❌ อัปโหลด Cloudinary ล้มเหลว:", error);
              return reject(new Error("❌ อัปโหลดสลิปการชำระเงินล้มเหลว"));
            }
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    } catch (error) {
      throw error;
    }

    // ✅ ตรวจสอบว่าสินค้ามีเพียงพอหรือไม่
    for (const item of parsedItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product || product.stock < item.quantity) {
        throw new Error(`❌ สินค้า ${item.name} คงเหลือไม่เพียงพอ`);
      }
    }

    // ✅ หักสต็อกสินค้า
    for (const item of parsedItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { session }
      );
    }

    // ✅ สร้างออเดอร์ใหม่
    const newOrder = new Order({
      customer: parsedCustomer,
      items: parsedItems,
      totalAmount,
      paymentSlip: uploadResult.secure_url,
      status: "pending",
    });

    await newOrder.save({ session });

    // ✅ Commit Transaction (บันทึกข้อมูลทั้งหมด)
    await session.commitTransaction();
    console.log("✅ บันทึกออเดอร์สำเร็จ:", newOrder);
    res.status(201).json({ success: true, order: newOrder });

  } catch (error) {
    // ❌ Rollback Transaction ถ้ามีปัญหา
    console.error("❌ เกิดข้อผิดพลาด:", error.message);
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });

  } finally {
    session.endSession(); // ✅ ปิด Session เสมอ ไม่ให้ค้าง
  }
});

router.get("/list", async (req, res) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 }); // เรียงลำดับจากใหม่ไปเก่า
      res.status(200).json({ success: true, orders });
    } catch (error) {
      console.error("❌ ดึงออเดอร์ล้มเหลว:", error);
      res.status(500).json({ success: false, message: "❌ ไม่สามารถดึงข้อมูลออเดอร์ได้" });
    }
});

router.put("/orders/:orderId/status", async (req, res) => {
    try {
      const { status, trackingNumber } = req.body;
  
      // 🔹 ถ้าสถานะเป็น "shipped" ต้องมี trackingNumber
      if (status === OrderStatus.Shipped && !trackingNumber) {
        return res.status(400).json({ message: "กรุณากรอกเลข Tracking Number" });
      }
  
      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.orderId,
        { status, trackingNumber },
        { new: true }
      );
  
      if (!updatedOrder) {
        return res.status(404).json({ message: "ไม่พบออเดอร์นี้" });
      }
  
      res.status(200).json(updatedOrder);
    } catch (error) {
      console.error("❌ อัปเดตสถานะล้มเหลว:", error);
      res.status(500).json({ message: "❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
    }
  });
  

router.get("/user/:userId", async (req, res) => {
    try {
      const orders = await Order.find({ "customer._id": req.params.userId }).sort({ createdAt: -1 });
  
      if (!orders.length) {
        return res.status(404).json({ success: false, message: "❌ ไม่พบออเดอร์ของคุณ" });
      }
  
      res.status(200).json({ success: true, orders });
    } catch (error) {
      console.error("❌ ดึงออเดอร์ของลูกค้าล้มเหลว:", error);
      res.status(500).json({ success: false, message: "❌ ไม่สามารถดึงข้อมูลออเดอร์ของคุณได้" });
    }
});
  
  

export default router;
