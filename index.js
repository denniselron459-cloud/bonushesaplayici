const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================== AYARLAR ================== */

// Yetkili ROL ID'leri
const AUTHORIZED_ROLE_IDS = [
  "14327226106676553621",
  "1454564464727949493"
];

// Komutun çalışacağı kanal
const CHANNEL_ID = "1426947227208908850";

// Bonus miktarı
const BONUS_PER_KILL = 150000;

/* ============================================= */

client.once("ready", () => {
  console.log(`Bot aktif: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;
  if (message.content !== "!bonushesapla") return;

  // Yetki kontrolü (ID ile)
  const hasPermission = message.member.roles.cache.some(role =>
    AUTHORIZED_ROLE_IDS.includes(role.id)
  );

  if (!hasPermission) {
    return message.reply("❌ Bu komutu kullanamazsın.");
  }

  const messages = await message.channel.messages.fetch({ limit: 100 });

  const killMap = new Map();

  messages.forEach(msg => {
    if (msg.author.bot) return;

    const lines = msg.content.split("\n");

    lines.forEach(line => {
      const match = line.match(/(.+?)\s+(\d+)/);
      if (!match) return;

      const name = match[1].trim();
      const kills = parseInt(match[2]);

      if (!isNaN(kills)) {
        killMap.set(name, (killMap.get(name) || 0) + kills);
      }
    });
  });

  const sorted = [...killMap.entries()]
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return message.reply("❌ Hesaplanacak veri bulunamadı.");
  }

  let result = "🏆 **BizzWar Bonus Sonuçları** 🏆\n\n";

  sorted.forEach(([name, kills], index) => {
    const bonus = kills * BONUS_PER_KILL;

    let emoji = "🔹";
    if (index === 0) emoji = "🥇";
    if (index === 1) emoji = "🥈";
    if (index === 2) emoji = "🥉";

    result += `${emoji} **${index + 1}.** ${name} → ${kills} kill | 💰 ${bonus.toLocaleString()}$\n`;
  });

  message.channel.send(result);
});

client.login(process.env.BOT_TOKEN);
