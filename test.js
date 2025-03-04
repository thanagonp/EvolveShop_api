import cloudinary from "./config/cloudinary.js";


(async () => {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "products", // ค้นหาไฟล์ทั้งหมดในโฟลเดอร์ products
      max_results: 100 // จำกัดผลลัพธ์ 100 รายการ
    });

    console.log("✅ รายการ Public ID ทั้งหมด:", result.resources.map(r => r.public_id));
  } catch (error) {
    console.error("❌ ไม่สามารถดึงข้อมูลจาก Cloudinary:", error);
  }
})();
