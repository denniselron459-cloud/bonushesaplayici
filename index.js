const { Client, GatewayIntentBits } = require("discord.js");

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
   ⚙️ YETKİLİ ROLLER
======================= */
const YETKILI_ROL_IDS = [
  "1432722610667655362",
  "1454564464727949493",
  "1426979504559231117"
];

/* =======================
   📌 KANAL AYARLARI
   BURAYA KANAL ID EKLE
======================= */
const KANAL_CONFIG = {

  /* BIZZWAR LOSE */
  "KANAL_ID_1": {
    tip: "mention",
    baslik: "🏆 **BIZZWAR LOSE KILLS** 🏆",
    referans: "1470081739622846535",
    killUcreti: 5000
  },

  /* BIZZWAR WIN */
  "KANAL_ID_2": {
    tip: "mention",
    baslik: "🏆 **BIZZWAR WIN KILLS** 🏆",
    referans: "1470080051570671880",
    killUcreti: 150000
  },

  /* RATING */
  "KANAL_ID_3": {
    tip: "mention",
    baslik: "🏆 **RATING BATTLE WIN KILLS** 🏆",
    referans: "1470077379538849994",
    killUcreti: 35000
  },

  /* WEAPON FACTORY */
  "KANAL_ID_4": {
    tip: "mention",
    baslik: "🏆 **WEAPON FACTORY WIN KILLS** 🏆",
    referans: "1470085417683517521",
    killUcreti: 35000
  },

  /* STATE BIG ZONE */
  "KANAL_ID_5": {
    tip: "state",
    baslik: "🏆 **STATE CONTROL BIG ZONE BONUS** 🏆",
    referans: "1467289527398699029",
    katilimUcreti: 100000,
    killUcreti: 50000
  },

  /* STATE SMALL ZONE */
  "KANAL_ID_6": {
    tip: "state",
    baslik: "🏆 **STATE CONTROL SMALL ZONE BONUS** 🏆",
    referans: "1470079239817793743",
    katilimUcreti: 70000,
    killUcreti: 40000
  }

};

/* =======================
   📦 GLOBAL
======================= */
let aktifSonucData = [];
let sonucMesajIds = [];

/* =======================
   🏆 SONUÇ METNİ
======================= */
function sonucMetniOlustur(config) {

  let lines = [];
  lines.push(config.baslik + "\n\n");

  aktifSonucData.forEach((u, i) => {
    const emoji =
      i === 0 ? "🥇" :
      i === 1 ? "🥈" :
      i === 2 ? "🥉" : "🔫";

    if (config.tip === "mention") {
      lines.push(
        `${emoji} <@${u.id}> — ${u.kill} kill — ${(u.kill * config.killUcreti).toLocaleString()}$ ${u.paid ? "✅" : ""}\n`
      );
    } else {
      lines.push(
        `${emoji} <@${u.id}>\n` +
        `👥 Katılım: ${u.katilim} | 🔫 Kill: ${u.kill} | 💰 ${u.para.toLocaleString()}$ ${u.paid ? "✅" : ""}\n\n`
      );
    }
  });

  return lines;
}

/* =======================
   📤 GÜNCELLE
======================= */
async function sonucuGuncelle(channel, config) {

  const lines = sonucMetniOlustur(config);

  let text = lines.join("");
  const mesaj = await channel.send(text);
  sonucMesajIds = [mesaj.id];
}

/* =======================
   📩 MESAJ EVENT
======================= */
client.on("messageCreate", async (message) => {

  if (message.author.bot || !message.guild) return;

  const config = KANAL_CONFIG[message.channel.id];
  if (!config) return;

  const uye = await message.guild.members.fetch(message.author.id);
  const yetkiliMi = uye.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id));
  if (!yetkiliMi) return;

  /* =======================
     !PAID / !UNPAID
  ======================= */
  if (message.content.startsWith("!paid") || message.content.startsWith("!unpaid")) {

    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply("❌ Kişi etiketle.");

    const kayit = aktifSonucData.find(x => x.id === hedef.id);
    if (!kayit) return message.reply("❌ Bu kişi listede yok.");

    kayit.paid = message.content.startsWith("!paid");

    await sonucuGuncelle(message.channel, config);
    return;
  }

  /* =======================
     !BONUSHESAPLA
  ======================= */
  if (message.content !== "!bonushesapla") return;

  let tumMesajlar = [];
  let lastId = null;
  let bulundu = false;

  while (!bulundu) {

    const opt = { limit: 100 };
    if (lastId) opt.before = lastId;

    const fetched = await message.channel.messages.fetch(opt);
    if (!fetched.size) break;

    for (const msg of fetched.values()) {
      if (BigInt(msg.id) <= BigInt(config.referans)) {
        bulundu = true;
        break;
      }
      tumMesajlar.push(msg);
    }

    lastId = fetched.last().id;
  }

  const data = new Map();

  for (const msg of tumMesajlar) {

    if (msg.author.bot) continue;

    /* ===== MENTION SİSTEM ===== */
    if (config.tip === "mention") {

      for (const satir of msg.content.split("\n")) {

        const match = satir.match(/<@!?(\d+)>/);
        if (!match) continue;

        const id = match[1];
        const kill = parseInt(satir.replace(/<@!?\d+>/, "").trim());
        if (isNaN(kill)) continue;

        if (!data.has(id))
          data.set(id, { id, kill: 0, paid: false });

        data.get(id).kill += kill;
      }
    }

    /* ===== STATE SİSTEM ===== */
    else {

      if (!msg.attachments.size) continue;

      const id = msg.author.id;

      if (!data.has(id))
        data.set(id, { id, katilim: 0, kill: 0, paid: false });

      const user = data.get(id);
      user.katilim += 1;

      for (const satir of msg.content.split("\n")) {
        const match = satir.match(/(\d{1,2})\s*(k|kill)/i);
        if (match)
          user.kill += parseInt(match[1]);
      }
    }
  }

  let sonucList = [...data.values()];

  if (config.tip === "state") {
    sonucList = sonucList.map(u => ({
      ...u,
      para: u.katilim * config.katilimUcreti + u.kill * config.killUcreti
    })).sort((a,b)=> b.para - a.para);
  } else {
    sonucList.sort((a,b)=> b.kill - a.kill);
  }

  aktifSonucData = sonucList;

  await sonucuGuncelle(message.channel, config);
});

/* ======================= */

client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
