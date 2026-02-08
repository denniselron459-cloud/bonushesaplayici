const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = "BOT_TOKENİNİ_BURAYA_YAZ";

let data = {};
let paid = {};

if (fs.existsSync("./data.json")) data = JSON.parse(fs.readFileSync("./data.json"));
if (fs.existsSync("./paid.json")) paid = JSON.parse(fs.readFileSync("./paid.json"));

function saveData() {
  fs.writeFileSync("./data.json", JSON.stringify(data, null, 2));
  fs.writeFileSync("./paid.json", JSON.stringify(paid, null, 2));
}

// kill algılama
function extractKills(text) {
  const regex = /(\d+)\s*(k|kill|kills|öldürme)/gi;
  let total = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    total += parseInt(match[1]);
  }
  return total;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  if (!data[userId]) {
    data[userId] = { join: 0, kill: 0 };
  }

  // 📌 katılım
  let participation = 1;

  // 📷 fotoğraf sayısı
  if (message.attachments.size > 0) {
    participation += message.attachments.size - 1;
  }

  data[userId].join += participation;

  // ☠️ kill
  const kills = extractKills(message.content);
  if (kills > 0) {
    data[userId].kill += kills;

    // kill var ama katılım yok durumu
    if (participation === 0) {
      data[userId].join += 1;
    }
  }

  saveData();
});

// 📊 BONUS HESAPLA
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "bonus") {
    let results = [];

    for (const id in data) {
      if (paid[id]) continue;

      const join = data[id].join;
      const kill = data[id].kill;
      const money = (join * 20000) + (kill * 10000);

      results.push({ id, join, kill, money });
    }

    results.sort((a, b) => b.money - a.money
