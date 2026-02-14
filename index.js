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

const REFERANS_MESAJ_ID = "1470085417683517521";
const KILL_UCRETI = 35000; // WEAPON FACTORY

let sonucMesajId = null;

/* ======================= */

client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

/* =======================
   SONUÇ METNİ OLUŞTUR
======================= */

function sonucMetniOlustur(liste) {
  let text = "🏆 **WEAPON FACTORY WIN KILLS** 🏆\n\n";

  liste.forEach((u, i) => {
    const emoji =
      i === 0 ? "🥇" :
      i === 1 ? "🥈" :
      i === 2 ? "🥉" : "🔫";

    text += `${emoji} <@${u.userId}> — ${u.kill} kill — ${(u.kill * KILL_UCRETI).toLocaleString()}$ ${u.paid ? "✅" : ""}\n`;
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
        .sort((a, b) => b[1] - a[1])
        .map(([userId, kill]) => ({
          userId,
          kill,
          paid: false
        }));

      const sonucMesaj = await message.channel.send(
        sonucMetniOlustur(sirali)
      );

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

      if (!sonucMesajId)
        return message.reply("❌ Önce !bonushesapla çalıştır.");

      const mesaj = await message.channel.messages.fetch(sonucMesajId);

      let yeniIcerik = mesaj.content;

      const regex = new RegExp(`(<@!?${hedef.id}>.*)`, "g");
      const satir = yeniIcerik.match(regex);

      if (!satir)
        return message.reply("❌ Bu kişi listede yok.");

      if (satir[0].includes("✅"))
        return message.reply("⚠️ Zaten paid.");

      const guncelSatir = satir[0] + " ✅";
      yeniIcerik = yeniIcerik.replace(satir[0], guncelSatir);

      await mesaj.edit(yeniIcerik);
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

      if (!sonucMesajId)
        return message.reply("❌ Önce !bonushesapla çalıştır.");

      const mesaj = await message.channel.messages.fetch(sonucMesajId);

      let yeniIcerik = mesaj.content;

      const regex = new RegExp(`(<@!?${hedef.id}>.*)`, "g");
      const satir = yeniIcerik.match(regex);

      if (!satir)
        return message.reply("❌ Bu kişi listede yok.");

      const guncelSatir = satir[0].replace(" ✅", "");
      yeniIcerik = yeniIcerik.replace(satir[0], guncelSatir);

      await mesaj.edit(yeniIcerik);
      message.delete().catch(() => {});
    }

  } catch (err) {
    console.error("HATA:", err);
  }

});

client.login(process.env.DISCORD_TOKEN);
