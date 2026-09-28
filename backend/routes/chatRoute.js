import express from "express";
import database from "../services/database.js";

const router = express.Router();

function responseText(data) {
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("\n");
}

router.post("/chat", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "ระบบแชตยังไม่ได้ตั้งค่า OPENAI_API_KEY" });

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const conversation = messages
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message.content === "string")
    .slice(-12)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 2000) }));
  if (!conversation.length || conversation.at(-1).role !== "user") {
    return res.status(400).json({ message: "กรุณาพิมพ์ข้อความที่ต้องการสอบถาม" });
  }

  try {
    const [products] = await database.query(
      "SELECT pdId, pdName, pdPrice, pdRemark FROM `Product` ORDER BY pdId LIMIT 80",
    );
    const catalog = products.map((product) =>
      `${product.pdName} (รหัส ${product.pdId}, ราคา ${product.pdPrice ?? "สอบถาม"} บาท)${product.pdRemark ? ` — ${product.pdRemark}` : ""}`,
    ).join("\n");
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: `คุณคือผู้ช่วยร้าน I HAVE KU ตอบเป็นภาษาไทยอย่างสุภาพ กระชับ และช่วยแนะนำสินค้าจากรายการปัจจุบันด้านล่างเท่านั้น อย่าแต่งราคา สต็อก หรือคุณสมบัติที่ไม่มีข้อมูล หากไม่ทราบให้บอกลูกค้าให้ติดต่อร้าน\n\nรายการสินค้า:\n${catalog || "ยังไม่มีข้อมูลสินค้า"}`,
        input: conversation,
        max_output_tokens: 500,
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(502).json({ message: data.error?.message || "AI ตอบกลับไม่สำเร็จ กรุณาลองอีกครั้ง" });
    }
    const answer = responseText(data);
    return res.json({ answer: answer || "ขออภัย ระบบยังสร้างคำตอบไม่ได้ กรุณาลองถามอีกครั้ง" });
  } catch (error) {
    console.error("Chat request failed:", error.message);
    return res.status(500).json({ message: "ระบบแชตขัดข้องชั่วคราว กรุณาลองอีกครั้ง" });
  }
});

export default router;
