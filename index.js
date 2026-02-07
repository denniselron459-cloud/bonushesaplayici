const { 
  Client, 
  GatewayIntentBits, 
  Partials 
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // 🔴 EN KRİTİK SATIR
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// ===== AYARLAR =====
const LEADER_ROLE_ID = "1432722610667655362";
const DEPUTY_ROLE_ID = "1454564464727949493";
const KILL_PARA = 150000;
// ===================

client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

// 🧪 TEST KOMUTU (SİLME)
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content === "!test") {
    message.reply("✅ Bot mesajları görüyor");
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.content !== "!bonushesapla") return;

  // 🔒 YETKİ KONTROLÜ
  const yetkiliMi = message.member.roles.cache.has(LEADER_ROLE_ID)
    || message.member.roles.cache.has(DEPUTY_ROLE_ID);

  if (!yetkiliMi) {
    return message.reply("❌ Bu komutu kullanamazsın.");
  }

  const kanal = message.channel;

  // 📥 Son 50 mesaj
  const mesajlar = await kanal.messages.fetch({ limit: 50 });

  // Önceki bot mesajını bul
  const sonBotMesaji = mesajlar.find(m =>
    m.author.id === client.user.id &&
    m.content.includes("BizzWar Bonus")
  );

  let hedefMesaj = null;

  for (const msg of mesajlar.values()) {
    if (sonBotMesaji && msg.createdTimestamp <= sonBotMesaji.createdTimestamp) continue;
    if (msg.author.bot) continue;

    if (msg.content.split("\n").some(s => /^.+\s+\d+$/.test(s))) {
      hedefMesaj = msg;
      break;
    }
  }

  if (!hedefMesaj) {
    return message.reply("❌ Uygun kill listesi bulunamadı.");
  }

  const satirlar = hedefMesaj.content.split("\n");
  let sonuc = "🏆 **BizzWar Bonus Sonuçları** 🏆\n\n";
  let bulundu = false;

  for (const satir of satirlar) {
    const eslesme = satir.match(/^(.+?)\s+(\d+)$/);
    if (!eslesme) continue;

    bulundu = true;

    const isim = eslesme[1].trim();
    const kill = Number(eslesme[2]);
    const para = kill * KILL_PARA;

    const uye = message.guild.members.cache.find(
      m => m.displayName.toLowerCase() === isim.toLowerCase()
    );

    const etiket = uye ? `<@${uye.id}>` : isim;

    sonuc += `🔫 ${etiket} → **${kill} kill** | 💰 **${para.toLocaleString()}$**\n`;
  }

  if (!bulundu) {
    return message.reply("❌ Kill verisi okunamadı.");
  }

  kanal.send(sonuc);
});

// 🔑 TOKEN
client.login(process.env.DISCORD_TOKEN);
