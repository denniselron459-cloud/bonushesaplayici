const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

/* 🔧 BURAYI DÜZENLE */
const YETKILI_ROL_IDLERI = [
  "1432722610667655362",
  "1454564464727949493"
];

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content !== "!bonushesapla") return;

    // 🔑 MEMBER'I ZORLA FETCH ET (CACHE FIX)
    const member = await message.guild.members.fetch(message.author.id);

    // 🔒 YETKİ KONTROLÜ
    const yetkiliMi = member.roles.cache.some(role =>
      YETKILI_ROL_IDLERI.includes(role.id)
    );

    if (!yetkiliMi) {
      return message.reply("❌ Bu komutu kullanamazsın.");
    }

    const kanal = message.channel;

    // 📥 Son 50 mesajı çek
    const mesajlar = await kanal.messages.fetch({ limit: 50 });

    // 🤖 Son bot hesaplama mesajını bul
    const sonHesaplama = mesajlar.find(m =>
      m.author.id === client.user.id &&
      m.content.includes("BizzWar Bonus")
    );

    let hedefMesaj = null;

    for (const mesaj of mesajlar.values()) {
      if (
        sonHesaplama &&
        mesaj.createdTimestamp <= sonHesaplama.createdTimestamp
      ) continue;

      if (mesaj.author.bot) continue;

      const satirlar = mesaj.content.split("\n");
      const uygunMu = satirlar.some(s => /^.+\s+\d+$/.test(s));

      if (uygunMu) {
        hedefMesaj = mesaj;
        break;
      }
    }

    if (!hedefMesaj) {
      return message.reply("❌ Uygun formatta mesaj bulunamadı.");
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

  } catch (err) {
    console.error("HATA:", err);
    message.reply("⚠️ Bir hata oluştu, loglara bak.");
  }
});

client.login(process.env.TOKEN);
