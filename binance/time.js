import express from "express";
const router = express.Router();

router.get("/", async (req, res) => {
  res.json({ server_time: Date.now() });
});

export default router;
