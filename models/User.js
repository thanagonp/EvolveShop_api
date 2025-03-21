import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true, sparse: true }, // สำหรับล็อกอินแบบอื่น
    telegramId: { type: String, unique: true, sparse: true }, // สำหรับล็อกอินด้วย Telegram
    password: { type: String },
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true },
    photo: { type: String },
    email: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["admin", "customer"], required: true },
});

export default mongoose.model("User", UserSchema);
