const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

/* =======================
   AYARLAR
======================= */

// Discord bot token
const TOKEN = process.env.TOKEN || "BOT_TOKEN_BURAYA";

// Yetkili roller (ID ile)
const YETKILI_ROL_IDLERI = [
  "1432722610667655362",
  "1454564464727949493"
];

// Kill başı para
const KILL_ODUL = 150000;

// Önceki hesaplama mesajında aranacak başlık
const HESAPLAMA_BASLIK = "BizzWar Bonus";

/* =======================
   BOT HAZIR
======================= */

client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

/* =======================
   KOMUT
======================= */

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content !== "!bonushesapla") return;

    // 🔒 Yetki kontrolü
    const yetkiliMi = message.member.roles.cache.some(role =>
      YETKILI_ROL_IDLERI.includes(role.id)
    );

    if (!yetkiliMi) {
      return message.reply("❌ Bu komutu kullanamazsın.");
    }

    const kanal = message.channel;

    // 📥 Son 100 mesajı çek
    const mesajlar = await kanal.messages.fetch({ limit: 100 });

    // 🤖 Son bot hesaplama mesajı
    const sonHesaplama = mesajlar.find(m =>
      m.author.id === client.user.id &&
      m.content.includes(HESAPLAMA_BASLIK)
    );

    // 📌 Hesaplanacak mesajı bul
    let hedefMesaj = null;

    for (const mesaj of mesajlar.values()) {
      if (sonHesaplama && mesaj.createdTimestamp <= sonHesaplama.createdTimestamp) continue;
      if (mesaj.author.bot) continue;

      const satirlar = mesaj.content.split("\n");
      const uygunMu = satirlar.some(s => /^.+\s+\d+$/.test(s.trim()));

      if (uygunMu) {
        hedefMesaj = mesaj;
        break;
      }
    }

    if (!hedefMesaj) {
      return kanal.send("❌ Son hesaplamadan sonra uygun formatta mesaj bulunamadı.");
    }

    /* =======================
       HESAPLAMA
    ======================= */

    const satirlar = hedefMesaj.content.split("\n");

    let sonucMesaji = `🏆 **${HESAPLAMA_BASLIK} Sonuçları** 🏆\n`;
    sonucMesaji += "_Ödeme alabilmek için online olmalısınız._\n\n";

    let bulundu = false;

    for (const satir of satirlar) {
      const eslesme = satir.trim().match(/^(.+?)\s+(\d+)$/);
      if (!eslesme) continue;

      bulundu = true;

      const isim = eslesme[1].trim();
      const kill = parseInt(eslesme[2]);
      const para = kill * KILL_ODUL;

      const uye = message.guild.members.cache.find(
        m => m.displayName.toLowerCase() === isim.toLowerCase()
      );

      const etiket = uye ? `<@${uye.id}>` : isim;

      sonucMesaji += `🔫 ${etiket} → **(${kill} kill)** | 💰 **${para.toLocaleString()}$**\n`;
    }

    if (!bulundu) {
      return kanal.send("❌ Kill verisi okunamadı.");
    }

    await kanal.send(sonucMesaji);

  } catch (err) {
    console.error("❌ Hata:", err);
    message.channel.send("⚠️ Hesaplama sırasında hata oluştu.");
  }
});

/* =======================
   BOT GİRİŞ
======================= */

client.login(TOKEN);
