import express from "express";
import database from "../services/database.js";

const router = express.Router();

function responseText(data) {
  return (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

router.post("/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "ระบบแชตยังไม่ได้ตั้งค่า GEMINI_API_KEY" });

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
    const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `คุณคือผู้ช่วยร้าน I HAVE KU ตอบเป็นภาษาไทยอย่างสุภาพ กระชับ และช่วยแนะนำสินค้าจากรายการปัจจุบันด้านล่างเท่านั้น อย่าแต่งราคา สต็อก หรือคุณสมบัติที่ไม่มีข้อมูล หากไม่ทราบให้บอกลูกค้าให้ติดต่อร้าน\n\nรายการสินค้า:\n${catalog || "ยังไม่มีข้อมูลสินค้า"}` }],
        },
        contents: conversation.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: { maxOutputTokens: 500 },
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Gemini API request failed:", data.error?.message || upstream.status);
      return res.status(502).json({ message: "AI ตอบกลับไม่สำเร็จ กรุณาตรวจสอบคีย์และโควตา Gemini API" });
    }
    const answer = responseText(data);
    return res.json({ answer: answer || "ขออภัย ระบบยังสร้างคำตอบไม่ได้ กรุณาลองถามอีกครั้ง" });
  } catch (error) {
    console.error("Chat request failed:", error.message);
    return res.status(500).json({ message: "ระบบแชตขัดข้องชั่วคราว กรุณาลองอีกครั้ง" });
  }
});

export default router;
