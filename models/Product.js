import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    images: [{ type: String, required: true }], // เก็บลิงก์รูปภาพจาก Cloudinary
    color: [{ type: String, required: true }],
    size: [{ type: String, required: true }],
    description: { type: String , default: "" },
    status: { type: String, enum: ["available", "unavailable"] , default: "available" },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", ProductSchema);
export default Product;
