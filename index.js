const { Client, GatewayIntentBits } = require("discord.js");

/* =======================
   🔧 NORMALIZE
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
   💳 ÖDENENLER
======================= */
const odenenler = new Set();

/* =======================
   🚀 READY
======================= */
client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

/* =======================
   📩 KOMUTLAR
======================= */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    const args = message.content.split(" ");
    const komut = args[0];

    const member = await message.guild.members.fetch(message.author.id);
    if (!member.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id))) return;

    /* =======================
       💳 !odendi
    ======================= */
    if (komut === "!odendi") {
      if (!args[1]) return message.reply("❌ Kullanım: `!odendi @kişi`");

      const hedef = message.mentions.members.first();
      if (!hedef) return message.reply("❌ Kişi etiketle.");

      odenenler.add(hedef.id);
      return message.reply(`✅ **${hedef.displayName}** ödendi olarak işaretlendi.`);
    }

    /* =======================
       🔄 !iptal
    ======================= */
    if (komut === "!iptal") {
      if (!args[1]) return message.reply("❌ Kullanım: `!iptal @kişi`");

      const hedef = message.mentions.members.first();
      if (!hedef) return message.reply("❌ Kişi etiketle.");

      odenenler.delete(hedef.id);
      return message.reply(`♻️ **${hedef.displayName}** ödeme iptal edildi.`);
    }

    /* =======================
       🧮 !bonushesapla
    ======================= */
    if (komut !== "!bonushesapla") return;

    await message.guild.members.fetch();

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
    if (!referansMesaj) return message.reply("❌ Referans mesaj bulunamadı.");

    const data = new Map();

    for (const msg of tumMesajlar) {
      if (
        msg.author.bot ||
        msg.createdTimestamp <= referansMesaj.createdTimestamp
      ) continue;

      const yazar = normalizeIsim(msg.author.username);

      if (!data.has(yazar)) {
        data.set(yazar, { katilim: 0, kill: 0 });
      }

      /* 🔹 HER MESAJ = 1 KATILIM */
      data.get(yazar).katilim += 1;

      /* 🔹 FOTOĞRAF SAYISI = EKSTRA KATILIM */
      if (msg.attachments.size > 0) {
        data.get(yazar).katilim += msg.attachments.size;
      }

      /* 🔥 KILL ALGILAMA (MESAJ SAHİBİNE) */
      const killMatch = msg.content.match(/(\d{1,3})\s*(k|kill|kills)/i);
      if (killMatch) {
        const kill = parseInt(killMatch[1]);
        if (kill > 0 && kill <= 50) {
          data.get(yazar).kill += kill;

          // kill varsa ama katılım 0 olamaz
          if (data.get(yazar).katilim === 0) {
            data.get(yazar).katilim = 1;
          }
        }
      }
    }

    const sonucList = [];

    for (const [isim, d] of data.entries()) {
      const para = d.katilim * KATILIM_UCRETI + d.kill * KILL_UCRETI;
      sonucList.push({ isim, ...d, para });
    }

    sonucList.sort((a, b) => b.para - a.para);

    let sonuc = "🏆 **STATE CONTROL BONUS** 🏆\n\n";

    sonucList.forEach((u, i) => {
      const emoji = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🔫";
      const uye = enYakinUyeyiBul(message.guild, u.isim);
      const paid = uye && odenenler.has(uye.id) ? " ✅ **PAID**" : "";
      const isim = uye ? `<@${uye.id}>` : u.isim;

      sonuc += `${emoji} **${i + 1}.** ${isim} → **${u.katilim} katılım ${u.kill} kill : ${u.para.toLocaleString()}$**${paid}\n`;
    });

    const LIMIT = 1900;
    let buffer = "";

    for (const satir of sonuc.split("\n")) {
      if ((buffer + satir).length > LIMIT) {
        await message.channel.send(buffer);
        buffer = "";
      }
      buffer += satir + "\n";
    }

    if (buffer.length) await message.channel.send(buffer);

  } catch (err) {
    console.error("❌ HATA:", err);
    message.reply("❌ Bir hata oluştu.");
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(process.env.DISCORD_TOKEN);
