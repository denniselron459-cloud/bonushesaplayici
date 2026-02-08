const { Client, GatewayIntentBits } = require("discord.js");

/* =======================
   🔧 İSİM NORMALİZASYONU
======================= */
function normalizeIsim(str = "") {
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .replace(/\s+/g, " ");
}

/* =======================
   🔍 EN YAKIN ÜYE
======================= */
function enYakinUyeyiBul(guild, isim) {
  const hedef = normalizeIsim(isim);

  const adaylar = guild.members.cache.filter(m =>
    normalizeIsim(m.displayName).includes(hedef) ||
    normalizeIsim(m.user.username).includes(hedef)
  );

  if (!adaylar.size) return null;

  return adaylar
    .sort((a, b) => a.displayName.length - b.displayName.length)
    .first();
}

/* =======================
   🤖 CLIENT
======================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

/* =======================
   ⚙️ AYARLAR
======================= */
const YETKILI_ROL_IDS = [
  "1432722610667655362",
  "1454564464727949493"
];

const REFERANS_MESAJ_ID = "1467280724297252926";
const KILL_UCRETI = 35000;

/* =======================
   🚀 READY
======================= */
client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

/* =======================
   📩 KOMUT
======================= */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;
    if (message.content !== "!ratinghesapla") return;

    const yetkili = await message.guild.members.fetch(message.author.id);
    if (!yetkili.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id))) {
      return message.reply("❌ Bu komutu kullanamazsın.");
    }

    await message.guild.members.fetch();

    /* =======================
       📥 MESAJLARI ÇEK
    ======================= */
    let tumMesajlar = [];
    let lastId = null;
    let bulundu = false;

    while (!bulundu) {
      const opt = { limit: 100 };
      if (lastId) opt.before = lastId;

      const fetched = await message.channel.messages.fetch(opt);
      if (!fetched.size) break;

      for (const msg of fetched.values()) {
        if (BigInt(msg.id) <= BigInt(REFERANS_MESAJ_ID)) {
          bulundu = true;
          break;
        }
        tumMesajlar.push(msg);
      }
      lastId = fetched.last().id;
    }

    /* =======================
       📊 HESAPLAMA (FIX)
    ======================= */
    const killMap = new Map();
    let toplamBonus = 0;

    for (const msg of tumMesajlar) {
      if (msg.author.bot) continue;

      for (const satir of msg.content.split("\n")) {
        const temiz = satir.trim();
        if (!temiz) continue;

        const match = temiz.match(/(\d+)\s*$/);
        if (!match) continue;

        const kill = parseInt(match[1]);
        if (isNaN(kill)) continue;

        const isimParca = temiz.slice(0, match.index).trim();
        if (!isimParca) continue;

        // 🔑 ÜYE BUL (ID ÖNCELİKLİ)
        let uye =
          message.guild.members.cache.find(m =>
            normalizeIsim(m.displayName) === normalizeIsim(isimParca) ||
            normalizeIsim(m.user.username) === normalizeIsim(isimParca)
          ) || enYakinUyeyiBul(message.guild, isimParca);

        const key = uye ? uye.id : normalizeIsim(isimParca);

        if (!killMap.has(key)) {
          killMap.set(key, {
            kill: 0,
            uye,
            isim: isimParca
          });
        }

        killMap.get(key).kill += kill;
      }
    }

    if (!killMap.size) {
      return message.reply("❌ Kill bulunamadı.");
    }

    const sirali = [...killMap.values()].sort((a, b) => b.kill - a.kill);

    /* =======================
       🏆 BAŞLIK
    ======================= */
    await message.channel.send("🏆 **RATING BATTLE KILL BONUS** 🏆");

    /* =======================
       📤 KİŞİLER
    ======================= */
    for (let i = 0; i < sirali.length; i++) {
      const { kill, uye, isim } = sirali[i];
      const para = kill * KILL_UCRETI;
      toplamBonus += para;

      const emoji =
        i === 0 ? "🥇" :
        i === 1 ? "🥈" :
        i === 2 ? "🥉" : "🔫";

      const gosterim = uye ? `<@${uye.id}>` : isim;

      await message.channel.send(
        `${emoji} **${i + 1}.** ${gosterim}\n` +
        `🔫 Kill: **${kill}** | 💰 **${para.toLocaleString()}$**`
      );
    }

    /* =======================
       💰 TOPLAM BONUS
    ======================= */
    await message.channel.send(
      `💰 **TOPLAM DAĞITILACAK BONUS:** **${toplamBonus.toLocaleString()}$**`
    );

  } catch (err) {
    console.error("❌ HATA:", err);
    message.reply("❌ Bir hata oluştu.");
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(process.env.DISCORD_TOKEN);
