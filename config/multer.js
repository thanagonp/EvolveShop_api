import multer from "multer";
import path from "path";

// กำหนด Disk Storage (เก็บชั่วคราว)
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("รองรับเฉพาะไฟล์ JPEG, JPG, PNG และ WEBP เท่านั้น!"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // จำกัดขนาดรูป 2MB
});

export default upload;
