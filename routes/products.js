import express from "express";
import multer from "multer";
import Product from "../models/Product.js";

const router = express.Router();

// ตั้งค่า multer
const upload = multer({ storage: multer.memoryStorage() });

// 📌 API: เพิ่มสินค้าใหม่
// ✅ ใช้ `multer` รับ `multipart/form-data`
router.post("/add", upload.array("images", 5), async (req, res) => {
  try {
      const { name, price , stock , color , size , description , status } = req.body;
      let images = req.body.images;
      
      if (!name || !price || !stock || !color || !size ) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

      if (!images || images.length === 0) {
          return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป" });
      }

      // 📌 ถ้า images เป็น string (กรณีมีแค่รูปเดียว) ให้แปลงเป็น array
      if (typeof images === "string") {
          images = [images];
      }

      const peoductStatus = status || "available";

      // 📌 สร้างสินค้าใหม่
      const newProduct = new Product({
          name,
            price,
            stock,
            images,
            color,
            size,
            description,
            status: peoductStatus,
      });

      await newProduct.save();

      res.status(201).json({ message: "เพิ่มสินค้าสำเร็จ!", product: newProduct });
  } catch (error) {
      console.error("❌ เกิดข้อผิดพลาด:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มสินค้า" });
  }
});

router.get("/list", async (req, res) => {
  try {
      const products = await Product.find();
      res.json(products);
  } catch (error) {
      console.error("❌ เกิดข้อผิดพลาด:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงสินค้า" });
  }
})





export default router;
