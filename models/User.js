import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true, sparse: true }, // เจ้าของร้านใช้ userId + password
  password: { type: String },
  facebookId: { type: String, unique: true, sparse: true }, // ลูกค้าใช้ Facebook Login
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ["admin", "customer"], required: true },
});

export default mongoose.model("User", UserSchema);
