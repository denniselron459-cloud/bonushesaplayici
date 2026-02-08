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
    return (
      normalizeIsim(m.displayName).includes(hedef) ||
      normalizeIsim(m.user.username).includes(hedef)
    );
  });
  if (!adaylar.size) return null;
  return adaylar.sort((a, b) => a.displayName.length - b.displayName.length).first();
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

    const yetkili = await message.guild.members.fetch(message.author.id);
    if (!yetkili.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id))) return;

    /* =======================
       💳 !odendi
    ======================= */
    if (komut === "!odendi" || komut === "!iptal") {
      await message.guild.members.fetch();
      const hedef =
        message.mentions.members.first() ||
        enYakinUyeyiBul(message.guild, args.slice(1).join(" "));
      if (!hedef) return message.reply("❌ Kişi bulunamadı.");

      if (komut === "!odendi") {
        odenenler.add(hedef.id);
        return message.reply(`✅ **${hedef.displayName}** ödendi.`);
      } else {
        odenenler.delete(hedef.id);
        return message.reply(`♻️ **${hedef.displayName}** ödeme iptal edildi.`);
      }
    }

    if (komut !== "!bonushesapla") return;

    /* =======================
       📥 MESAJLARI ÇEK
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

    const data = new Map();

    for (const msg of tumMesajlar) {
      if (msg.author.bot) continue;

      // 🔒 REFERANS VE ÖNCESİ YOK
      if (BigInt(msg.id) <= BigInt(REFERANS_MESAJ_ID)) continue;

      // 📸 KANIT ZORUNLU
      if (!msg.attachments.size) continue;

      const yazar = normalizeIsim(msg.author.username);
      if (!data.has(yazar)) data.set(yazar, { katilim: 0, kill: 0 });

      // ✅ 1 MESAJ = 1 KATILIM
      data.get(yazar).katilim += 1;

      // 🔥 KILL ALGILAMA (ALT SATIR + K / KILL)
      for (const satir of msg.content.split("\n")) {
        const match = satir.match(/(\d{1,2})\s*(k|kill|kills)/i);
        if (!match) continue;

        const kill = parseInt(match[1]);
        if (kill > 0 && kill <= 50) {
          data.get(yazar).kill += kill;
        }
      }
    }

    const sonucList = [];
    for (const [isim, d] of data.entries()) {
      sonucList.push({
        isim,
        ...d,
        para: d.katilim * KATILIM_UCRETI + d.kill * KILL_UCRETI
      });
    }

    sonucList.sort((a, b) => b.para - a.para);

    let sonuc = "🏆 **STATE CONTROL BONUS** 🏆\n\n";

    sonucList.forEach((u, i) => {
      const emoji = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🔫";
      const uye = enYakinUyeyiBul(message.guild, u.isim);
      const paid = uye && odenenler.has(uye.id) ? " ✅ **ÖDENDİ**" : "";
      const isimGoster = uye ? `<@${uye.id}>` : u.isim;

      sonuc += `${emoji} **${i + 1}.** ${isimGoster} → **${u.katilim} katılım ${u.kill} öldürme : ${u.para.toLocaleString()}$**${paid}\n`;
    });

    await message.channel.send(sonuc);

  } catch (err) {
    console.error("❌ HATA:", err);
    message.reply("❌ Bir hata oluştu.");
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(process.env.DISCORD_TOKEN);
