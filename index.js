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
  "1426979504559231117"
];

const REFERANS_MESAJ_ID = "1470080051570671880";
const KILL_UCRETI = 150000;

/* =======================
   📦 GLOBAL DATA
======================= */
let aktifSonucData = [];
let sonucMesajId = null;

/* =======================
   🚀 READY
======================= */
client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

/* =======================
   📊 SONUÇ MESAJI OLUŞTUR
======================= */
function sonucMetniOlustur() {
  let text = "🏆 **BIZZWAR WIN KILLS** 🏆\n\n";

  aktifSonucData.forEach((u, i) => {
    const emoji =
      i === 0 ? "🥇" :
      i === 1 ? "🥈" :
      i === 2 ? "🥉" : "🔫";

    text += `${emoji} ${u.gosterim} — ${u.kill} kill — ${u.para.toLocaleString()}$ ${u.paid ? "✅" : ""}\n`;
  });

  return text;
}

/* =======================
   📩 KOMUTLAR
======================= */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    const yetkili = await message.guild.members.fetch(message.author.id);
    const yetkiliMi = yetkili.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id));

    /* =======================
       !BONUSHESAPLA
    ======================= */
    if (message.content === "!bonushesapla") {

      if (!yetkiliMi) {
        return message.reply("❌ Yetkin yok.");
      }

      await message.guild.members.fetch();

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

      const killMap = new Map();

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

          const key = normalizeIsim(isimParca);
          killMap.set(key, (killMap.get(key) || 0) + kill);
        }
      }

      if (!killMap.size) {
        return message.reply("❌ Kill bulunamadı.");
      }

      const sirali = [...killMap.entries()].sort((a, b) => b[1] - a[1]);

      aktifSonucData = [];

      for (let i = 0; i < sirali.length; i++) {
        const [isim, kill] = sirali[i];
        const para = kill * KILL_UCRETI;

        let uye = message.guild.members.cache.find(m =>
          normalizeIsim(m.displayName) === isim ||
          normalizeIsim(m.user.username) === isim
        );

        const gosterim = uye ? `<@${uye.id}>` : isim;

        aktifSonucData.push({
          gosterim,
          kill,
          para,
          paid: false
        });
      }

      const sonuc = await message.channel.send(sonucMetniOlustur());
      sonucMesajId = sonuc.id;
    }

    /* =======================
       !PAID
    ======================= */
    if (message.content.startsWith("!paid")) {

      if (!yetkiliMi) return message.reply("❌ Yetkin yok.");

      const uye = message.mentions.members.first();
      if (!uye) return message.reply("❌ Kullanıcı etiketle.");

      const kayit = aktifSonucData.find(u =>
        u.gosterim === `<@${uye.id}>`
      );

      if (!kayit) return message.reply("❌ Bu kişi listede yok.");

      kayit.paid = true;

      const mesaj = await message.channel.messages.fetch(sonucMesajId);
      await mesaj.edit(sonucMetniOlustur());

      message.delete().catch(() => {});
    }

    /* =======================
       !UNPAID
    ======================= */
    if (message.content.startsWith("!unpaid")) {

      if (!yetkiliMi) return message.reply("❌ Yetkin yok.");

      const uye = message.mentions.members.first();
      if (!uye) return message.reply("❌ Kullanıcı etiketle.");

      const kayit = aktifSonucData.find(u =>
        u.gosterim === `<@${uye.id}>`
      );

      if (!kayit) return message.reply("❌ Bu kişi listede yok.");

      kayit.paid = false;

      const mesaj = await message.channel.messages.fetch(sonucMesajId);
      await mesaj.edit(sonucMetniOlustur());

      message.delete().catch(() => {});
    }

  } catch (err) {
    console.error("HATA:", err);
    message.reply("❌ Bir hata oluştu.");
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(process.env.DISCORD_TOKEN);
