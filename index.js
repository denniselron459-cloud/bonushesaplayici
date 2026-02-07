const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// 🔒 Yetkili rol ID’leri
const YETKILI_ROL_IDS = [
  "1432722610667655362",
  "1454564464727949493"
];

client.on("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content !== "!bonushesapla") return;

  // ✅ MEMBER'I ZORLA FETCH
  const member = await message.guild.members.fetch(message.author.id);

  const yetkiliMi = member.roles.cache.some(role =>
    YETKILI_ROL_IDS.includes(role.id)
  );

  if (!yetkiliMi) {
    return message.reply("❌ Bu komutu kullanamazsın.");
  }

  // 📥 Son 100 mesaj
  const mesajlar = await message.channel.messages.fetch({ limit: 100 });

  // 🤖 Son bot hesaplama mesajı
  const sonBotMesaji = mesajlar.find(m =>
    m.author.bot && m.content.includes("BizzWar Bonus")
  );

  const killMap = new Map();

  for (const mesaj of mesajlar.values()) {
    if (sonBotMesaji && mesaj.createdTimestamp <= sonBotMesaji.createdTimestamp) continue;
    if (mesaj.author.bot) continue;

    const satirlar = mesaj.content.split("\n");

    for (const satir of satirlar) {
      const eslesme = satir.match(/^(.+?)\s+(\d+)$/);
      if (!eslesme) continue;

      const isim = eslesme[1].trim().toLowerCase();
      const kill = parseInt(eslesme[2]);

      killMap.set(isim, (killMap.get(isim) || 0) + kill);
    }
  }

  if (killMap.size === 0) {
    return message.reply("❌ Uygun kill verisi bulunamadı.");
  }

  // 🔢 Sıralama
  const sirali = [...killMap.entries()].sort((a, b) => b[1] - a[1]);

  let sonuc = "🏆 **BizzWar Bonus Sonuçları** 🏆\n\n";

  sirali.forEach(([isim, kill], index) => {
    const para = kill * 150000;
    const emoji =
      index === 0 ? "🥇" :
      index === 1 ? "🥈" :
      index === 2 ? "🥉" : "🔫";

    sonuc += `${emoji} **${index + 1}.** ${isim} → **${kill} kill** | 💰 **${para.toLocaleString()}$**\n`;
  });

  message.channel.send(sonuc);
});

client.login(process.env.DISCORD_TOKEN);
