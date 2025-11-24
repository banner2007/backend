import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ msg: "Hola desde el backend Render" });
});

export default router;
