const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = "notm_verify_token";

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", (req, res) => {
  console.log("Mensagem recebida:");
  console.log(JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
