import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    sparse: true, // เผื่อไว้ใช้ login แบบ owner
  },
  telegramId: {
    type: String,
    unique: true,
    sparse: true, // login ด้วย Telegram
  },
  username: {
    type: String,
    unique: true,
    sparse: true, // มีบางคนจาก Telegram ไม่มี username
  },
  password: {
    type: String, // ใช้เฉพาะเจ้าของร้าน
  },
  name: {
    type: String,
    required: true,
  },
  photo: {
    type: String, // ใช้เฉพาะฝั่ง Telegram
  },
  role: {
    type: String,
    enum: ["admin", "customer"],
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model("User", UserSchema);
