import express from "express";
import multer from "multer";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js"; // ✅ นำเข้า Cloudinary
import mongoose from "mongoose";

const router = express.Router();

// ตั้งค่า multer
const upload = multer({ storage: multer.memoryStorage() });

// 📌 API: ลบรูปภาพจาก Cloudinary
router.post("/delete-image", async (req, res) => {
  try {
      const { publicId, productId } = req.body;

      console.log("📌 Public ID ที่รับจาก Frontend:", publicId);
      console.log("📌 Product ID ที่ต้องอัปเดต:", productId);

      if (!publicId || typeof publicId !== "string" || !productId) {
          return res.status(400).json({ message: "❌ ไม่พบ Public ID หรือ Product ID ไม่ถูกต้อง" });
      }

      // ✅ ค้นหาทุกไฟล์ที่ขึ้นต้นด้วย `publicId`
      const resourceList = await cloudinary.api.resources({
          type: "upload",
          prefix: `ecommerce/products/${publicId}`
      });

      if (resourceList.resources.length === 0) {
          return res.status(404).json({ message: "❌ ไม่พบไฟล์ใน Cloudinary" });
      }

      // ✅ ใช้ Public ID ตัวเต็มที่ถูกต้อง
      const correctPublicId = resourceList.resources[0].public_id;
      console.log("📌 Public ID ที่จะลบ:", correctPublicId);

      // ✅ ลบภาพออกจาก Cloudinary
      const result = await cloudinary.uploader.destroy(correctPublicId, { invalidate: true });

      if (result.result !== "ok") {
          return res.status(500).json({ message: "❌ ไม่สามารถลบรูปได้" });
      }

      // ✅ อัปเดต MongoDB เพื่อลบ URL ของรูปออกจาก `images` array
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $pull: { images: { $regex: publicId } } }, // ลบเฉพาะรูปที่ตรงกับ `publicId`
        { new: true }
      );

      if (!updatedProduct) {
          return res.status(404).json({ message: "❌ ไม่พบสินค้าในระบบ" });
      }

      res.status(200).json({ 
        message: "✅ ลบรูปภาพสำเร็จ", 
        deletedPublicId: correctPublicId,
        updatedProduct, // ✅ ส่งข้อมูลสินค้าที่อัปเดตกลับไปให้ Frontend
      });

  } catch (error) {
      console.error("❌ ลบภาพล้มเหลว:", error);
      res.status(500).json({ message: "❌ เกิดข้อผิดพลาดในการลบรูป" });
  }
});

// 📌 API: ดึงรายการสินค้า
router.get("/list", async (req, res) => {
  try {
      const products = await Product.find();
      res.json(products);
  } catch (error) {
      console.error("❌ เกิดข้อผิดพลาด:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงสินค้า" });
  }
});

// 📌 API: ดึงสินค้าตาม ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ ตรวจสอบว่า ID ถูกต้องหรือไม่
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "❌ รหัสสินค้าไม่ถูกต้อง" });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "❌ ไม่พบสินค้าในระบบ" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("❌ ดึงสินค้าล้มเหลว:", error);
    res.status(500).json({ message: "❌ เกิดข้อผิดพลาดในการดึงสินค้า" });
  }
});


  
// 📌 API: เพิ่มสินค้าใหม่
router.post("/add", upload.array("images", 5), async (req, res) => {
  try {
      const { name, price, stock, color, size, description, status } = req.body;
      let images = req.body.images;

      if (!name || !price || !stock || !color || !size) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

      if (!images || images.length === 0) {
          return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป" });
      }

      // 📌 ถ้า images เป็น string (กรณีมีแค่รูปเดียว) ให้แปลงเป็น array
      if (typeof images === "string") {
          images = [images];
      }

      const productStatus = status || "available";

      // 📌 สร้างสินค้าใหม่
      const newProduct = new Product({
          name,
          price,
          stock,
          images,
          color,
          size,
          description,
          status: productStatus,
      });

      await newProduct.save();

      res.status(201).json({ message: "เพิ่มสินค้าสำเร็จ!", product: newProduct });
  } catch (error) {
      console.error("❌ เกิดข้อผิดพลาด:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มสินค้า" });
  }
});

// 📌 API: อัปเดตสินค้า (แก้ไข)
router.put("/update/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, stock, images, color, size, description, status } = req.body;
  
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { name, price, stock, images, color, size, description, status },
        { new: true }
      );
  
      if (!updatedProduct) {
        return res.status(404).json({ message: "ไม่พบสินค้า" });
      }
  
      res.status(200).json({ message: "อัปเดตสินค้าสำเร็จ!", product: updatedProduct });
    } catch (error) {
      console.error("❌ อัปเดตสินค้าล้มเหลว:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตสินค้า" });
    }
  });

  // 📌 API: ลบสินค้าและรูปภาพทั้งหมดที่เกี่ยวข้อง
router.delete("/delete/:id", async (req, res) => {
  try {
      const { id } = req.params;

      // ✅ ค้นหาสินค้าใน MongoDB
      const product = await Product.findById(id);
      if (!product) {
          return res.status(404).json({ message: "❌ ไม่พบสินค้า" });
      }

      // ✅ ลบรูปภาพทั้งหมดใน Cloudinary
      const deletePromises = product.images.map(async (imageUrl) => {
          const publicId = imageUrl.split("/").pop().split(".")[0]; // ดึง Public ID
          return cloudinary.uploader.destroy(`ecommerce/products/${publicId}`);
      });

      // 🔹 รอลบรูปทั้งหมดให้เสร็จ
      await Promise.all(deletePromises);

      // ✅ ลบสินค้าจาก MongoDB
      await Product.findByIdAndDelete(id);

      res.status(200).json({ message: "✅ ลบสินค้าสำเร็จ พร้อมลบรูปทั้งหมด!" });
  } catch (error) {
      console.error("❌ ลบสินค้าล้มเหลว:", error);
      res.status(500).json({ message: "❌ เกิดข้อผิดพลาดในการลบสินค้า" });
  }
});

// 📌 API: ดึงข้อมูล stock ของสินค้า
router.get("/:id/stock", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select("stock");
    if (!product) {
      return res.status(404).json({ success: false, message: "❌ ไม่พบสินค้า" });
    }
    res.status(200).json({ success: true, stock: product.stock });
  } catch (error) {
    console.error("❌ ดึงข้อมูล stock ล้มเหลว:", error);
    res.status(500).json({ success: false, message: "❌ ไม่สามารถดึงข้อมูล stock ได้" });
  }
});


export default router;
