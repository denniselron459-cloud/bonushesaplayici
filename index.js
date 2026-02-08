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
   🔍 EN YAKIN ÜYE BUL
======================= */
function enYakinUyeyiBul(guild, isim) {
  const hedef = normalizeIsim(isim);

  const adaylar = guild.members.cache.filter(m => {
    const dn = normalizeIsim(m.displayName);
    const un = normalizeIsim(m.user.username);
    return dn.includes(hedef) || un.includes(hedef);
  });

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

const REFERANS_MESAJ_ID = "1467301119867879454";
const KATILIM_UCRETI = 70000;
const KILL_UCRETI = 40000;

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
    if (
      message.author.bot ||
      !message.guild ||
      message.content !== "!bonushesapla"
    ) return;

    const member = await message.guild.members.fetch(message.author.id);
    if (!member.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id))) {
      return message.reply("❌ Bu komutu kullanamazsın.");
    }

    await message.guild.members.fetch();

    /* =======================
       📥 MESAJLARI GÜVENLİ ÇEK
    ======================= */
    let tumMesajlar = [];
    let lastId = null;
    let bulundu = false;

    while (!bulundu) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const fetched = await message.channel.messages.fetch(options);
      if (!fetched.size) break;

      for (const msg of fetched.values()) {
        tumMesajlar.push(msg);
        if (msg.id === REFERANS_MESAJ_ID) {
          bulundu = true;
          break;
        }
      }

      lastId = fetched.last().id;
    }

    const referansMesaj = tumMesajlar.find(m => m.id === REFERANS_MESAJ_ID);
    if (!referansMesaj) {
      return message.reply("❌ Referans mesaj bulunamadı.");
    }

    /* =======================
       🧠 DATA TOPLA
    ======================= */
    const data = new Map();

    for (const mesaj of tumMesajlar) {
      if (
        mesaj.author.bot ||
        mesaj.createdTimestamp <= referansMesaj.createdTimestamp
      ) continue;

      const yazar = normalizeIsim(mesaj.author.username);

      if (!data.has(yazar)) {
        data.set(yazar, { katilim: 0, kill: 0 });
      }

      // ✅ HER MESAJ = 1 KATILIM
      data.get(yazar).katilim += 1;

      // 🔥 KILL ALGILAMA (2k / 2 kill / 2 kills)
      const satirlar = mesaj.content.split("\n");

      for (const satir of satirlar) {
        const match = satir.trim().match(
          /^(.+?)[\s:.-]+(\d+)\s*(k|kill|kills)?$/i
        );
        if (!match) continue;

        const isim = normalizeIsim(match[1]);
        const kill = parseInt(match[2]);
        if (isNaN(kill)) continue;

        if (!data.has(isim)) {
          data.set(isim, { katilim: 0, kill: 0 });
        }

        data.get(isim).kill += kill;
      }
    }

    if (!data.size) {
      return message.reply("❌ Veri bulunamadı.");
    }

    /* =======================
       💰 HESAPLA
    ======================= */
    const sonucList = [];

    for (const [isim, d] of data.entries()) {
      const para =
        d.katilim * KATILIM_UCRETI +
        d.kill * KILL_UCRETI;

      sonucList.push({ isim, ...d, para });
    }

    // 🥇 EN ÇOK PARA ÜSTE
    sonucList.sort((a, b) => b.para - a.para);

    /* =======================
       🏆 SONUÇ METNİ
    ======================= */
    let sonuc = "🏆 **STATE CONTROL BONUS** 🏆\n\n";

    sonucList.forEach((u, i) => {
      const emoji =
        i === 0 ? "🥇" :
        i === 1 ? "🥈" :
        i === 2 ? "🥉" : "🔫";

      let uye = message.guild.members.cache.find(m =>
        normalizeIsim(m.displayName) === u.isim ||
        normalizeIsim(m.user.username) === u.isim
      );

      if (!uye) uye = enYakinUyeyiBul(message.guild, u.isim);

      const gosterim = uye ? `<@${uye.id}>` : u.isim;

      sonuc += `${emoji} **${i + 1}.** ${gosterim} → **${u.katilim} katılım ${u.kill} öldürme : ${u.para.toLocaleString()}$**\n`;
    });

    /* =======================
       📤 2000 KARAKTER FIX
    ======================= */
    const LIMIT = 1900;
    let buffer = "";

    for (const satir of sonuc.split("\n")) {
      if ((buffer + satir).length > LIMIT) {
        await message.channel.send(buffer);
        buffer = "";
      }
      buffer += satir + "\n";
    }

    if (buffer.length) {
      await message.channel.send(buffer);
    }

  } catch (err) {
    console.error("❌ HATA:", err);
    message.reply("❌ Bir hata oluştu.");
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(process.env.DISCORD_TOKEN);
