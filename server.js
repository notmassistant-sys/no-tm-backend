import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/* ===============================
   ROTA PRINCIPAL – NO TM (AI)
================================ */
app.post("/webhook", async (req, res) => {
  try {
    const { mensagem } = req.body;

    if (!mensagem) {
      return res.status(400).json({ erro: "Mensagem não enviada" });
    }

    const prompt = `
Você é o assistente NO TM.
Gere 3 respostas para a mensagem abaixo:

Mensagem:
"${mensagem}"

Regras:
1. Resposta educada
2. Resposta firme
3. Resposta profissional
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const data = await response.json();

    res.json({
      respostas: data.choices?.[0]?.message?.content || "Sem resposta"
    });

  } catch (erro) {
    console.error("Erro NO TM:", erro);
    res.status(500).json({ erro: "Erro interno" });
  }
});

/* ===============================
   WHATSAPP – VERIFICAÇÃO (GET)
================================ */
app.get("/webhook-whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook WhatsApp verificado");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* ===============================
   WHATSAPP – RECEBER MENSAGENS
================================ */
app.post("/webhook-whatsapp", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body;

    if (!text) return res.sendStatus(200);

    console.log("Mensagem recebida:", text);

    // chama o NO TM
    const aiResponse = await fetch("https://no-tm-backend.onrender.com/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem: text })
    });

    const data = await aiRespons
