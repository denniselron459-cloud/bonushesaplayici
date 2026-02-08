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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
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
   📩 BONUS KOMUTU
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
       🧠 DATA
    ======================= */
    const data = new Map();

    for (const mesaj of tumMesajlar) {
      if (
        mesaj.author.bot ||
        mesaj.createdTimestamp <= referansMesaj.createdTimestamp
      ) continue;

      const yazar = normalizeIsim(mesaj.author.username);
      if (!data.has(yazar)) data.set(yazar, { katilim: 0, kill: 0 });

      // ✅ HER MESAJ = 1 KATILIM
      data.get(yazar).katilim += 1;

      // 🔥 KILL ALGILAMA
      for (const satir of mesaj.content.split("\n")) {
        const match = satir.trim().match(
          /^(.+?)[\s:.-]+(\d{1,2})\s*(k|kill|kills)?$/i
        );
        if (!match) continue;

        const isim = normalizeIsim(match[1]);
        const kill = parseInt(match[2]);
        if (!kill || kill > 20) continue;

        if (!data.has(isim)) data.set(isim, { katilim: 0, kill: 0 });

        data.get(isim).katilim += 1;
        data.get(isim).kill += kill;
      }
    }

    /* =======================
       💰 HESAP
    ======================= */
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
      const gosterim = uye ? `<@${uye.id}>` : u.isim;

      sonuc += `${emoji} **${i + 1}.** ${gosterim} → **${u.katilim} katılım ${u.kill} öldürme : ${u.para.toLocaleString()}$**\n`;
    });

    const bonusMesaji = await message.channel.send(sonuc);
    await bonusMesaji.react("✅");

  } catch (err) {
    console.error(err);
    message.reply("❌ Bir hata oluştu.");
  }
});

/* =======================
   🟢 ÖDENDİ SİSTEMİ
======================= */
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot || reaction.emoji.name !== "✅") return;

  const message = reaction.message;
  if (!message.guild) return;

  const member = await message.guild.members.fetch(user.id);
  if (!member.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id))) return;

  if (message.content.includes("🟢 **ÖDENDİ**")) return;

  await message.edit(message.content + "\n\n🟢 **ÖDENDİ**");
  await message.reactions.removeAll();
});

/* =======================
   🔑 LOGIN
======================= */
client.login(process.env.DISCORD_TOKEN);
