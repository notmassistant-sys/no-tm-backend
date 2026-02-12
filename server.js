import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Health check (Render precisa disso)
app.get("/", (req, res) => {
  res.send("NO TM backend rodando 🚀");
});

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
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    res.json({
      respostas: data.choices[0].message.content,
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro interno" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
