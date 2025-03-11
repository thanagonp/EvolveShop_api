import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
//import passport from "passport";
//mport { Strategy as FacebookStrategy } from "passport-facebook";

const router = express.Router();

// 🔹 ตั้งค่า Facebook OAuth
/*passport.use(new FacebookStrategy({
  clientID: process.env.FB_APP_ID,
  clientSecret: process.env.FB_APP_SECRET,
  callbackURL: "http://localhost:5000/api/auth/facebook/callback",
  profileFields: ["id", "displayName", "emails"]
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ facebookId: profile.id });

    if (!user) {
      user = new User({
        facebookId: profile.id,
        name: profile.displayName,
        email: profile.emails[0]?.value || null,
        role: "customer",
      });
      await user.save();
    }

    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));*/

// ✅ เจ้าของร้าน Login (userId + password)
/*router.post("/admin/login", async (req, res) => {
  const { userId, password } = req.body;

  try {
    const user = await User.findOne({ userId, role: "admin" });
    if (!user) return res.status(400).json({ success: false, message: "❌ ไม่พบผู้ใช้" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "❌ รหัสผ่านไม่ถูกต้อง" });

    const token = jwt.sign({ id: user._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "2h" });

    res.json({ success: true, token, user: { id: user._id, userId: user.userId, role: user.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: "❌ มีบางอย่างผิดพลาด" });
  }
});

// ✅ ลูกค้า Login ผ่าน Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));

// ✅ Callback หลังจาก Login Facebook สำเร็จ
router.get("/facebook/callback", passport.authenticate("facebook", {
  failureRedirect: "/login",
  session: false
}), (req, res) => {
  const token = jwt.sign({ id: req.user._id, role: "customer" }, process.env.JWT_SECRET, { expiresIn: "2h" });

  res.redirect(`http://localhost:3000/customer/auth?token=${token}`);
});*/

export default router;
