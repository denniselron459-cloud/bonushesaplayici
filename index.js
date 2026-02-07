const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// 🔴 BURAYA ROL ID'LERİNİ GİR
const YETKILI_ROL_IDLERI = [
  "1432722610667655362",
  "1454564464727949493"
];

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content !== "!bonushesapla") return;

  // 🔐 Yetki kontrolü (ROL ID)
  const yetkiliMi = message.member.roles.cache.some(role =>
    YETKILI_ROL_IDLERI.includes(role.id)
  );

  if (!yetkiliMi) {
    return message.reply("❌ Bu komutu kullanamazsın.");
  }

  const kanal = message.channel;

  // 📥 Son 100 mesajı çek
  const mesajlar = await kanal.messages.fetch({ limit: 100 });

  // 🧠 REFERANS: Furi'nin attığı son !bonushesapla
  const referansMesaj = mesajlar.find(m =>
    m.author.username.toLowerCase().includes("furi") &&
    m.content === "!bonushesapla"
  );

  let hedefMesaj = null;

  for (const mesaj of mesajlar.values()) {
    if (referansMesaj && mesaj.createdTimestamp <= referansMesaj.createdTimestamp) continue;
    if (mesaj.author.bot) continue;

    const satirlar = mesaj.content.split("\n");
    const uygunMu = satirlar.some(s => /^.+\s+\d+$/.test(s));

    if (uygunMu) {
      hedefMesaj = mesaj;
      break;
    }
  }

  if (!hedefMesaj) {
    return message.reply("❌ Referans mesajdan sonra uygun kill listesi bulunamadı.");
  }

  const satirlar = hedefMesaj.content.split("\n");
  let sonucMesaji = "🏆 **BizzWar Bonus Sonuçları** 🏆\n\n";
  let bulundu = false;

  for (const satir of satirlar) {
    const eslesme = satir.match(/^(.+?)\s+(\d+)$/);
    if (!eslesme) continue;

    bulundu = true;

    const isim = eslesme[1].trim();
    const kill = parseInt(eslesme[2]);
    const para = kill * 150000;

    const uye = message.guild.members.cache.find(m =>
      m.displayName.toLowerCase() === isim.toLowerCase()
    );

    const etiket = uye ? `<@${uye.id}>` : isim;

    sonucMesaji += `🔫 ${etiket} → **${kill} kill** | 💰 **${para.toLocaleString()}$**\n`;
  }

  if (!bulundu) {
    return message.reply("❌ Kill verisi okunamadı.");
  }

  kanal.send(sonucMesaji);
});

client.login(process.env.TOKEN);
