const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // 🔴 ŞART
  ]
});

// 🔐 Yetkili rol ID'leri
const YETKILI_ROL_IDS = [
  "1432722610667655362",
  "1454564464727949493"
];

// 📌 REFERANS MESAJ (Furi'nin yaptığı hesaplama)
const REFERANS_MESAJ_ID = "1467279907766927588";

// 💰 Kill başı para
const KILL_UCRETI = 150000;

client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    console.log("MESAJ ALGILANDI:", message.content);

    if (message.author.bot) return;
    if (!message.guild) return;

    // ✅ KOMUT ALGILAMA (ESNEK)
    if (!message.content.toLowerCase().startsWith("!bonushesapla")) return;

    // 🔒 Yetki kontrolü
    const member = await message.guild.members.fetch(message.author.id);
    const yetkiliMi = member.roles.cache.some(role =>
      YETKILI_ROL_IDS.includes(role.id)
    );

    if (!yetkiliMi) {
      return message.reply("❌ Bu komutu kullanamazsın.");
    }

    // 📥 Son 200 mesajı çek
    const mesajlar = await message.channel.messages.fetch({ limit: 200 });

    // 📌 Referans mesajı bul (cache + fetch güvenli)
    let referansMesaj = mesajlar.get(REFERANS_MESAJ_ID);
    if (!referansMesaj) {
      try {
        referansMesaj = await message.channel.messages.fetch(REFERANS_MESAJ_ID);
      } catch {
        return message.reply("❌ Referans mesaj bulunamadı. ID yanlış olabilir.");
      }
    }

    const killMap = new Map();

    for (const mesaj of mesajlar.values()) {
      if (mesaj.createdTimestamp <= referansMesaj.createdTimestamp) continue;
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
      return message.reply("❌ Hesaplanacak kill bulunamadı.");
    }

    // 🔢 SIRALA
    const sirali = [...killMap.entries()].sort((a, b) => b[1] - a[1]);

    let sonuc = "🏆 **BizzWar Bonus Sonuçları** 🏆\n\n";

    sirali.forEach(([isim, kill], i) => {
      const para = kill * KILL_UCRETI;
      const emoji =
        i === 0 ? "🥇" :
        i === 1 ? "🥈" :
        i === 2 ? "🥉" : "🔫";

      sonuc += `${emoji} **${i + 1}.** ${isim} → **${kill} kill** | 💰 **${para.toLocaleString()}$**\n`;
    });

    await message.channel.send(sonuc);

  } catch (err) {
    console.error("❌ BONUS HESAPLAMA HATASI:", err);
    message.reply("❌ Bir hata oluştu, loglara bak.");
  }
});

client.login(process.env.DISCORD_TOKEN);
