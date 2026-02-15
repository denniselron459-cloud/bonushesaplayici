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
   YETKİLİ ROLLER
======================= */
const YETKILI_ROL_IDS = [
  "1432722610667655362",
  "1454564464727949493",
  "1426979504559231117"
];

/* =======================
   TÜM EVENTLER
======================= */
const KANAL_CONFIG = {

  /* BIZZWAR LOSE */
  "1465789812748583130": {
    tip: "mention",
    baslik: "🏆 **BIZZWAR LOSE KILLS** 🏆",
    referans: "1470081739622846535",
    killUcreti: 5000
  },

  /* BIZZWAR WIN */
  "1426947227208908850": {
    tip: "mention",
    baslik: "🏆 **BIZZWAR WIN KILLS** 🏆",
    referans: "1470080051570671880",
    killUcreti: 150000
  },

  /* RATING */
  "1435375574720712880": {
    tip: "mention",
    baslik: "🏆 **RATING BATTLE WIN KILLS** 🏆",
    referans: "1470077379538849994",
    killUcreti: 35000
  },

  /* WEAPON FACTORY */
  "1426946952502710423": {
    tip: "mention",
    baslik: "🏆 **WEAPON FACTORY WIN KILLS** 🏆",
    referans: "1470085417683517521",
    killUcreti: 35000
  },

  /* STATE BIG */
  "1454598540897554442": {
    tip: "state",
    baslik: "🏆 **STATE CONTROL BIG ZONE BONUS** 🏆",
    referans: "1467289527398699029",
    katilimUcreti: 100000,
    killUcreti: 50000
  },

  /* STATE SMALL */
  "1426947679103094824": {
    tip: "state",
    baslik: "🏆 **STATE CONTROL SMALL ZONE BONUS** 🏆",
    referans: "1470079239817793743",
    katilimUcreti: 70000,
    killUcreti: 40000
  }

};

let aktifSonucData = [];
let sonucMesajId = null;

/* =======================
   SONUÇ METNİ
======================= */
function sonucMetniOlustur(config) {

  let text = config.baslik + "\n\n";
  let toplam = 0;

  aktifSonucData.forEach((u, i) => {

    const emoji =
      i === 0 ? "🥇" :
      i === 1 ? "🥈" :
      i === 2 ? "🥉" : "🔫";

    if (config.tip === "mention") {

      const para = u.kill * config.killUcreti;
      toplam += para;

      text += `${emoji} <@${u.id}> — ${u.kill} kill — ${para.toLocaleString()}$ ${u.paid ? "✅" : ""}\n`;

    } else {

      toplam += u.para;

      text += `${emoji} <@${u.id}>\n`;
      text += `👥 Katılım: ${u.katilim} | 🔫 Kill: ${u.kill} | 💰 ${u.para.toLocaleString()}$ ${u.paid ? "✅" : ""}\n\n`;
    }

  });

  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 **TOPLAM DAĞITILACAK BONUS:** ${toplam.toLocaleString()}$`;

  return text;
}

/* =======================
   EVENT
======================= */
client.on("messageCreate", async (message) => {

  if (message.author.bot || !message.guild) return;

  const config = KANAL_CONFIG[message.channel.id];
  if (!config) return;

  try {

    const uye = await message.guild.members.fetch(message.author.id);
    const yetkiliMi = uye.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id));
    if (!yetkiliMi) return;

    /* ===== PAID ===== */
    if (message.content.startsWith("!paid") || message.content.startsWith("!unpaid")) {

      const hedef = message.mentions.members.first();
      if (!hedef) return message.reply("❌ Kişi etiketle.");

      const kayit = aktifSonucData.find(x => x.id === hedef.id);
      if (!kayit) return message.reply("❌ Bu kişi listede yok.");

      kayit.paid = message.content.startsWith("!paid");

      if (sonucMesajId) {
        const msg = await message.channel.messages.fetch(sonucMesajId);
        await msg.edit(sonucMetniOlustur(config));
      }

      return message.delete().catch(()=>{});
    }

    /* ===== BONUS HESAPLA ===== */
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

        if (config.referans && BigInt(msg.id) <= BigInt(config.referans)) {
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

      /* ===== MENTION ===== */
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

      /* ===== STATE ===== */
      else {

        const id = msg.author.id;

        if (!data.has(id))
          data.set(id, { id, katilim: 0, kill: 0, paid: false });

        const user = data.get(id);
        user.katilim += 1;

        for (const satir of msg.content.split("\n")) {

          const match = satir.match(/(\d{1,2})\s*(k|kill)/i);
          if (match) {
            const k = parseInt(match[1]);
            if (!isNaN(k))
              user.kill += k;
          }
        }
      }
    }

    if (!data.size)
      return message.reply("❌ Bu event için geçerli veri bulunamadı.");

    let sonucList = [...data.values()];

    if (config.tip === "mention") {
      sonucList.sort((a,b)=> b.kill - a.kill);
    } else {
      sonucList = sonucList.map(u => ({
        ...u,
        para: u.katilim * config.katilimUcreti + u.kill * config.killUcreti
      })).sort((a,b)=> b.para - a.para);
    }

    aktifSonucData = sonucList;

    const sonucMesaj = await message.channel.send(sonucMetniOlustur(config));
    sonucMesajId = sonucMesaj.id;

  } catch (err) {
    console.error("GERÇEK HATA:", err);
    message.reply("❌ Sistem hatası oluştu.");
  }

});

client.once("clientReady", () => {
  console.log("✅ Bot aktif:", client.user.tag);
});

client.login(process.env.DISCORD_TOKEN);
