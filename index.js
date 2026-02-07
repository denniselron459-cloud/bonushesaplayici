const { Client, GatewayIntentBits, Partials } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// 🔧 AYARLAR
const TOKEN = process.env.TOKEN; // Railway Variables
const YETKILI_ROL = "BLCK"; // değiştirebilirsin
const KILL_UCRETI = 150000;

// ✅ BOT HAZIR
client.once("ready", () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
});

// ✅ KOMUT
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.content.trim() !== "!bonushesapla") return;

    // 🔒 Yetki kontrolü
    const yetkiliMi = message.member.roles.cache.some(
      role => role.name === YETKILI_ROL
    );

    if (!yetkiliMi) {
      return message.reply("❌ Bu komutu kullanamazsın.");
    }

    const kanal = message.channel;

    // 📥 Son 100 mesaj
    const mesajlar = await kanal.messages.fetch({ limit: 100 });

    // 🤖 En son bot hesaplama mesajı
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
      return kanal.send("❌ Hesaplanacak uygun mesaj bulunamadı.");
    }

    const satirlar = hedefMesaj.content.split("\n");
    let sonuc = "🏆 **BizzWar Bonus Sonuçları** 🏆\n\n";
    let bulundu = false;

    for (const satir of satirlar) {
      const eslesme = satir.match(/^(.+?)\s+(\d+)$/);
      if (!eslesme) continue;

      bulundu = true;

      const isim = eslesme[1].trim();
      const kill = parseInt(eslesme[2]);
      const para = kill * KILL_UCRETI;

      const uye = message.guild.members.cache.find(
        m => m.displayName.toLowerCase() === isim.toLowerCase()
      );

      const etiket = uye ? `<@${uye.id}>` : isim;

      sonuc += `🔫 ${etiket} → **${kill} kill** | 💰 **${para.toLocaleString()}$**\n`;
    }

    if (!bulundu) {
      return kanal.send("❌ Kill verisi okunamadı.");
    }

    kanal.send(sonuc);

  } catch (err) {
    console.error("HATA:", err);
  }
});

// 🚀 GİRİŞ
client.login(TOKEN);
