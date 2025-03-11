import jwt from "jsonwebtoken";

export const protectAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ success: false, message: "⛔ Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") throw new Error("⛔ Forbidden");

    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: "⛔ Access Denied" });
  }
};
