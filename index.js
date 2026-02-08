const { Client, GatewayIntentBits, Partials } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

const START_MESSAGE_ID = "1467301119867879454";
const BONUS_CHANNEL_ID = "1426947679103094824";

function extractKills(text) {
  if (!text) return 0;
  text = text.toLowerCase();

  let total = 0;

  const regexes = [
    /(\d+)\s*kills?/g,
    /(\d+)\s*kill/g,
    /(\d+)\s*k\b/g,
    /kill bonus[:\s]*(\d+)/g,
  ];

  for (const r of regexes) {
    let m;
    while ((m = r.exec(text)) !== null) {
      total += parseInt(m[1]);
    }
  }

  return total;
}

client.once("ready", () => {
  console.log(`${client.user.tag} hazır`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!hesapla")) return;
  if (message.channel.id !== BONUS_CHANNEL_ID) return;

  const channel = message.channel;
  const messages = await channel.messages.fetch({ limit: 100 });

  const startMsg = await channel.messages.fetch(START_MESSAGE_ID);

  const data = {};

  for (const msg of messages.values()) {
    if (msg.createdTimestamp <= startMsg.createdTimestamp) continue;

    // 🔴 reply zorunlu
    if (!msg.reference) continue;
    if (msg.reference.messageId !== START_MESSAGE_ID) continue;

    // 🔴 kanıt zorunlu
    if (msg.attachments.size === 0) continue;

    const userId = msg.author.id;
    if (!data[userId]) {
      data[userId] = {
        user: msg.author,
        katilim: 0,
        kill: 0,
      };
    }

    // 📸 her foto = 1 katılım
    data[userId].katilim += msg.attachments.size;

    // 🔫 kill algılama
    data[userId].kill += extractKills(msg.content);
  }

  // 🔽 sıralama (para mantığı)
  const list = Object.values(data).sort((a, b) => {
    if (b.katilim !== a.katilim) return b.katilim - a.katilim;
    return b.kill - a.kill;
  });

  if (list.length === 0) {
    return channel.send("❌ Geçerli kanıt bulunamadı.");
  }

  // 📨 HER SATIR AYRI MESAJ
  let rank = 1;
  for (const p of list) {
    let emoji = "💵";
    if (rank === 1) emoji = "🥇";
    else if (rank === 2) emoji = "🥈";
    else if (rank === 3) emoji = "🥉";

    await channel.send(
      `${emoji} **${rank}. ${p.user}** → ${p.katilim} katılım ${p.kill} öldürme`
    );

    rank++;
  }
});

client.login(process.env.DISCORD_TOKEN);
