import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";

const router = express.Router();

// 📌 ตั้งค่า multer ให้รองรับ memoryStorage (ใช้ buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 📌 API: สร้างออเดอร์ใหม่ (อัปโหลดสลิปไปยัง Cloudinary)
router.post("/addOrder", upload.single("paymentSlip"), async (req, res) => {
  try {
    console.log("📌 รับข้อมูลจาก Client:", req.body);

    // ✅ ตรวจสอบว่ามีไฟล์ถูกส่งมาหรือไม่
    if (!req.file) {
      return res.status(400).json({ success: false, message: "❌ กรุณาแนบสลิปการชำระเงิน" });
    }

    // ✅ ดึงข้อมูลจาก req.body
    const { customer, items, totalAmount } = req.body;

    // ✅ ตรวจสอบและแปลง JSON (ป้องกัน JSON Format ผิดพลาด)
    let parsedCustomer, parsedItems;
        try {
        parsedCustomer = JSON.parse(customer);
        parsedItems = JSON.parse(items).map(item => ({
            product: item.id,  // ✅ เปลี่ยนจาก `id` เป็น `product`
            name: item.name,
            image: item.image,
            quantity: item.quantity,
            price: item.price
        }));
        } catch (error) {
        return res.status(400).json({ success: false, message: "❌ ข้อมูล JSON ไม่ถูกต้อง" });
        }

        console.log("📌 ข้อมูลลูกค้า:", parsedCustomer);
        console.log("📌 รายการสินค้า:", parsedItems); // ✅ ไม่มีปัญหา ReferenceError อีกต่อไป


    // ✅ อัปโหลดสลิปไปยัง Cloudinary (ใช้ buffer)
    const uploadPromise = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "payment_slips" },
        (error, result) => {
          if (error) {
            console.error("❌ อัปโหลด Cloudinary ล้มเหลว:", error);
            return reject(error);
          }
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const uploadResult = await uploadPromise;
    console.log("✅ Cloudinary URL:", uploadResult.secure_url);

    // ✅ สร้างออเดอร์ใหม่
    const newOrder = new Order({
      customer: parsedCustomer,
      items: parsedItems,
      totalAmount,
      paymentSlip: uploadResult.secure_url, // ✅ เก็บลิงก์ของภาพ
    });

    await newOrder.save();
    console.log("✅ บันทึกออเดอร์สำเร็จ:", newOrder);

    // ✅ อัปเดตจำนวนสินค้าในสต็อก
    for (const item of parsedItems) {
      console.log(`📌 อัปเดตสต็อกสินค้า ID: ${item.product}, จำนวน: ${item.quantity}`);
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error);
    res.status(500).json({ success: false, message: "❌ เกิดข้อผิดพลาดในการสร้างออเดอร์" });
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
