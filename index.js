const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// 🔧 AYARLAR
const TOKEN = process.env.TOKEN; // Railway Variables
const KILL_BASI_ODUL = 150000;

// Yetkili roller (isimle kontrol)
const YETKILI_ROLLER = ["Leader", "Deputy"];

// Referans alınacak başlık
const REFERANS_BASLIK = "BizzWar Bonus";

client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content !== "!bonushesapla") return;

  // 🔒 Yetki kontrolü
  const yetkiliMi = message.member.roles.cache.some(role =>
    YETKILI_ROLLER.includes(role.name)
  );

  if (!yetkiliMi) {
    return message.reply("❌ Bu komutu kullanamazsın.");
  }

  const kanal = message.channel;

  // 📥 Son 100 mesajı çek
  const mesajlar = await kanal.messages.fetch({ limit: 100 });

  // 🧠 REFERANS: En son "BizzWar Bonus" geçen mesaj (kim yazmış önemli değil)
  const referansMesaj = mesajlar.find(m =>
    m.content.includes(REFERANS_BASLIK)
  );

  let hedefMesaj = null;

  for (const mesaj of mesajlar.values()) {
    // Referanstan öncekileri alma
    if (referansMesaj && mesaj.createdTimestamp <= referansMesaj.createdTimestamp) continue;

    // Bot mesajlarını geç
    if (mesaj.author.bot) continue;

    // Kill formatı kontrolü: "isim sayı"
    const satirlar = mesaj.content.split("\n");
    const uygunMu = satirlar.some(s => /^.+\s+\d+$/.test(s));

    if (uygunMu) {
      hedefMesaj = mesaj;
      break;
    }
  }

  if (!hedefMesaj) {
    return kanal.send("❌ Referanstan sonra uygun kill listesi bulunamadı.");
  }

  const satirlar = hedefMesaj.content.split("\n");
  let sonuc = `🏆 **${REFERANS_BASLIK} Sonuçları** 🏆\n\n`;
  let bulundu = false;

  for (const satir of satirlar) {
    const eslesme = satir.match(/^(.+?)\s+(\d+)$/);
    if (!eslesme) continue;

    bulundu = true;

    const isim = eslesme[1].trim();
    const kill = parseInt(eslesme[2]);
    const para = kill * KILL_BASI_ODUL;

    // 👤 Discord üyesi bul (nickname / username)
    const uye = message.guild.members.cache.find(m =>
      m.displayName.toLowerCase() === isim.toLowerCase() ||
      m.user.username.toLowerCase() === isim.toLowerCase()
    );

    const etiket = uye ? `<@${uye.id}>` : isim;

    sonuc += `🔫 ${etiket} → **${kill} kill** | 💰 **${para.toLocaleString()}$**\n`;
  }

  if (!bulundu) {
    return kanal.send("❌ Kill verisi okunamadı.");
  }

  kanal.send(sonuc);
});

client.login(TOKEN);
