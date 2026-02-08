const { Client, GatewayIntentBits, Partials } = require("discord.js");

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
  return guild.members.cache.find(m =>
    normalizeIsim(m.displayName).includes(hedef) ||
    normalizeIsim(m.user.username).includes(hedef)
  ) || null;
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
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel]
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

    let messages = [];
    let lastId;
    let found = false;

    while (!found) {
      const fetched = await message.channel.messages.fetch({ limit: 100, before: lastId });
      if (!fetched.size) break;

      for (const msg of fetched.values()) {
        messages.push(msg);
        if (msg.id === REFERANS_MESAJ_ID) {
          found = true;
          break;
        }
      }
      lastId = fetched.last().id;
    }

    const referans = messages.find(m => m.id === REFERANS_MESAJ_ID);
    if (!referans) return message.reply("❌ Referans mesaj yok.");

    const data = new Map();

    for (const msg of messages) {
      if (msg.author.bot || msg.createdTimestamp <= referans.createdTimestamp) continue;

      const yazar = normalizeIsim(msg.author.username);
      if (!data.has(yazar)) data.set(yazar, { katilim: 0, kill: 0 });

      // 📸 Mesaj + ekler = katılım
      const katilimSayisi = 1 + msg.attachments.size;
      data.get(yazar).katilim += katilimSayisi;

      for (const satir of msg.content.split("\n")) {
        const match = satir.match(/^(.+?)[\s:.-]+(\d{1,2})\s*(k|kill|kills)?$/i);
        if (!match) continue;

        const isim = normalizeIsim(match[1]);
        const kill = Number(match[2]);
        if (!kill || kill > 20) continue;

        if (!data.has(isim)) data.set(isim, { katilim: 1, kill: 0 });

        // ❗ kill varsa ama katılım yoksa 1 yap
        if (data.get(isim).katilim === 0) data.get(isim).katilim = 1;

        data.get(isim).kill += kill;
      }
    }

    const sonucList = [...data.entries()].map(([isim, d]) => ({
      isim,
      ...d,
      para: d.katilim * KATILIM_UCRETI + d.kill * KILL_UCRETI
    })).sort((a, b) => b.para - a.para);

    let sonuc = "🏆 **STATE CONTROL BONUS** 🏆\n\n";
    sonucList.forEach((u, i) => {
      const uye = enYakinUyeyiBul(message.guild, u.isim);
      sonuc += `🔫 **${i + 1}.** ${uye ? `<@${uye.id}>` : u.isim} → **${u.katilim} katılım ${u.kill} kill : ${u.para.toLocaleString()}$**\n`;
    });

    const bonusMsg = await message.channel.send(sonuc);
    await bonusMsg.react("✅");

  } catch (e) {
    console.error(e);
    message.reply("❌ Hata oluştu.");
  }
});

/* =======================
   🟢 ÖDENDİ
======================= */
client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.emoji.name !== "✅") return;
    if (!reaction.message.content.includes("STATE CONTROL BONUS")) return;

    const member = await reaction.message.guild.members.fetch(user.id);
    if (!member.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id))) return;

    if (reaction.message.content.includes("🟢 **ÖDENDİ**")) return;

    await reaction.message.edit(reaction.message.content + "\n\n🟢 **ÖDENDİ**");
    await reaction.message.reactions.removeAll();

  } catch (e) {
    console.error("REACTION ERROR:", e);
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(process.env.DISCORD_TOKEN);
