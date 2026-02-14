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
   ⚙️ AYARLAR
======================= */

const YETKILI_ROL_IDS = [
  "1432722610667655362",
  "1454564464727949493",
  "1426979504559231117"
];

const REFERANS_MESAJ_ID = "1470080051570671880"; // değiştirme
const KILL_UCRETI = 150000; // 🔥 150K BONUS

/* =======================
   📦 GLOBAL
======================= */

let aktifSonucData = [];
let sonucMesajId = null;

/* =======================
   READY
======================= */

client.once("clientReady", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

/* =======================
   SONUÇ METNİ
======================= */

function sonucMetniOlustur() {
  let text = "🏆 **BIZZWAR WIN KILLS** 🏆\n\n";

  aktifSonucData.forEach((u, i) => {
    const emoji =
      i === 0 ? "🥇" :
      i === 1 ? "🥈" :
      i === 2 ? "🥉" : "🔫";

    text += `${emoji} ${u.mention} — ${u.kill} kill — ${u.para.toLocaleString()}$ ${u.paid ? "✅" : ""}\n`;
  });

  return text;
}

/* =======================
   MESAJ EVENT
======================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  try {

    const uye = await message.guild.members.fetch(message.author.id);
    const yetkiliMi = uye.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id));

    /* =======================
       !BONUSHESAPLA
    ======================= */

    if (message.content === "!bonushesapla") {

      if (!yetkiliMi)
        return message.reply("❌ Yetkin yok.");

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
          const mentionMatch = satir.match(/<@!?(\d+)>/);
          if (!mentionMatch) continue;

          const userId = mentionMatch[1];
          const sayi = satir.replace(/<@!?\d+>/, "").trim();
          const kill = parseInt(sayi);

          if (isNaN(kill)) continue;

          killMap.set(userId, (killMap.get(userId) || 0) + kill);
        }
      }

      if (!killMap.size)
        return message.reply("❌ Geçerli veri bulunamadı.");

      const sirali = [...killMap.entries()]
        .sort((a, b) => b[1] - a[1]);

      aktifSonucData = [];

      for (const [userId, kill] of sirali) {
        aktifSonucData.push({
          userId,
          mention: `<@${userId}>`,
          kill,
          para: kill * KILL_UCRETI,
          paid: false
        });
      }

      const sonucMesaj = await message.channel.send(sonucMetniOlustur());
      sonucMesajId = sonucMesaj.id;
    }

    /* =======================
       !PAID
    ======================= */

    if (message.content.startsWith("!paid")) {

      if (!yetkiliMi)
        return message.reply("❌ Yetkin yok.");

      const hedef = message.mentions.users.first();
      if (!hedef)
        return message.reply("❌ Kullanıcı etiketle.");

      const kayit = aktifSonucData.find(x => x.userId === hedef.id);
      if (!kayit)
        return message.reply("❌ Bu kişi listede yok.");

      kayit.paid = true;

      const mesaj = await message.channel.messages.fetch(sonucMesajId);
      await mesaj.edit(sonucMetniOlustur());

      message.delete().catch(() => {});
    }

    /* =======================
       !UNPAID
    ======================= */

    if (message.content.startsWith("!unpaid")) {

      if (!yetkiliMi)
        return message.reply("❌ Yetkin yok.");

      const hedef = message.mentions.users.first();
      if (!hedef)
        return message.reply("❌ Kullanıcı etiketle.");

      const kayit = aktifSonucData.find(x => x.userId === hedef.id);
      if (!kayit)
        return message.reply("❌ Bu kişi listede yok.");

      kayit.paid = false;

      const mesaj = await message.channel.messages.fetch(sonucMesajId);
      await mesaj.edit(sonucMetniOlustur());

      message.delete().catch(() => {});
    }

  } catch (err) {
    console.error("HATA:", err);
  }
});

client.login(process.env.DISCORD_TOKEN);
