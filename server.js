import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

/* ==========================
   CONFIG
========================== */
const PORT = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

/* ==========================
   HEALTH CHECK
========================== */
app.get("/health", (req, res) => {
  res.send("OK");
});

/* ==========================
   META WEBHOOK VERIFY
========================== */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/* ==========================
   WEBHOOK RECEIVER
========================== */
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;

    /* ==========================
       USER SENT TEXT
    ========================== */
    if (message.text) {
      const userMessage = message.text.body;

      // 1️⃣ CALL CHATGPT
      const options = await gerarRespostas(userMessage);

      // 2️⃣ SEND BUTTONS
      await enviarBotoes(from, options);

      return res.sendStatus(200);
    }

    /* ==========================
       USER CLICKED BUTTON
    ========================== */
    if (message.interactive?.button_reply) {
      const respostaEscolhida = message.interactive.button_reply.title;

      await enviarTexto(from, respostaEscolhida);
      return res.sendStatus(200);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro webhook:", err);
    res.sendStatus(500);
  }
});

/* ==========================
   OPENAI — GENERATE RESPONSES
========================== */
async function gerarRespostas(mensagem) {
  const prompt = `
Você é o assistente NOtm.
Gere exatamente 3 respostas curtas para WhatsApp:

1. Educada
2. Firme
3. Profissional

Mensagem recebida:
"${mensagem}"

Responda APENAS em JSON no formato:
{
  "opcoes": ["...", "...", "..."]
}
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
      temperature: 0.6
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;

  return JSON.parse(content).opcoes;
}

/* ==========================
   SEND BUTTONS
========================== */
async function enviarBotoes(to, opcoes) {
  await fetch(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: "Escolha a resposta que deseja enviar:"
          },
          action: {
            buttons: opcoes.map((texto, i) => ({
              type: "reply",
              reply: {
                id: `resp_${i + 1}`,
                title: texto.slice(0, 20)
              }
            }))
          }
        }
      })
    }
  );
}

/* ==========================
   SEND FINAL MESSAGE
========================== */
async function enviarTexto(to, text) {
  await fetch(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        text: { body: text }
      })
    }
  );
}

/* ==========================
   START SERVER
========================== */
app.listen(PORT, () => {
  console.log(`🚀 NOtm rodando na porta ${PORT}`);
});
