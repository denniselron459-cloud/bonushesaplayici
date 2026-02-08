const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// AYARLAR
const BONUS_CHANNEL_ID = "KANAL_ID";
const KATILIM_PARASI = 50000;
const KILL_PARASI = 10000;

// KILL ALGILAMA REGEX
const KILL_REGEX = /(\d+)\s*(k|kill|kills)/i;

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== BONUS_CHANNEL_ID) return;
  if (!message.content.startsWith("!bonushesapla")) return;

  const messages = await message.channel.messages.fetch({ limit: 100 });
  const users = new Map();

  for (const msg of messages.values()) {
    if (msg.author.bot) continue;

    // 📌 KANIT KONTROLÜ
    const hasImage = msg.attachments.size > 0;
    const hasLink = /(https?:\/\/)/i.test(msg.content);

    if (!hasImage && !hasLink) continue; // ❌ kanıt yoksa YOK SAY

    const userId = msg.author.id;

    if (!users.has(userId)) {
      users.set(userId, {
        user: msg.author,
        katilim: 0,
        kill: 0,
        proofs: []
      });
    }

    const data = users.get(userId);

    // 📸 HER FOTO = 1 KATILIM
    const imageCount = msg.attachments.size;
    data.katilim += imageCount > 0 ? imageCount : 1;

    // 🎯 KILL ALGILAMA
    const match = msg.content.match(KILL_REGEX);
    if (match) {
      const killCount = parseInt(match[1]);
      if (!isNaN(killCount)) {
        data.kill += killCount;
      }
    }

    // 📎 KANIT SAKLA
    msg.attachments.forEach(a => data.proofs.push(a.url));
    if (hasLink) {
      const links = msg.content.match(/https?:\/\/\S+/gi);
      if (links) data.proofs.push(...links);
    }
  }

  // ❌ SADECE KILL VAR AMA KATILIM YOKSA SİL
  const finalList = [...users.values()].filter(u => u.katilim > 0);

  // 💰 PARA HESABI
  finalList.forEach(u => {
    u.money = (u.katilim * KATILIM_PARASI) + (u.kill * KILL_PARASI);
  });

  // 🥇 EN ÇOK PARA ALAN ÜSTE
  finalList.sort((a, b) => b.money - a.money);

  const medals = ["🥇", "🥈", "🥉"];

  if (finalList.length === 0) {
    return message.channel.send("❌ Geçerli kanıt bulunamadı.");
  }

  // 🧾 HER SATIRI AYRI MESAJ AT
  for (let i = 0; i < finalList.length; i++) {
    const u = finalList[i];
    const emoji = medals[i] || "🎯";

    await message.channel.send(
      `${emoji} **${i + 1}. ${u.user}**\n` +
      `📊 **${u.katilim} katılım – ${u.kill} öldürme**\n` +
      `💰 **${u.money.toLocaleString()}$**`
    );
  }
});

client.login("DISCORD_TOKEN");
