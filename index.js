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
  "1454564464727949493",
  "1426979504559231117"
];

const REFERANS_MESAJ_ID = "1470079239817793743";
const KATILIM_UCRETI = 70000;
const KILL_UCRETI = 40000;

/* =======================
   📦 GLOBAL
======================= */
let aktifSonucData = [];
let sonucMesajIds = [];

/* =======================
   🚀 READY
======================= */
client.once("clientReady", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

/* =======================
   📝 SONUÇ METNİ
======================= */
function sonucMetniOlustur() {
  let lines = [];
  lines.push("🏆 **STATE CONTROL BONUS** 🏆\n");

  aktifSonucData.forEach((u, i) => {
    const emoji =
      i === 0 ? "🥇" :
      i === 1 ? "🥈" :
      i === 2 ? "🥉" : "🔫";

    lines.push(
      `${emoji} **${i + 1}.** ${u.tag}\n` +
      `👥 Katılım: **${u.katilim}** | 🔫 Kill: **${u.kill}** | 💰 **${u.para.toLocaleString()}$** ${u.paid ? "✅" : ""}\n`
    );
  });

  const toplam = aktifSonucData.reduce((t, u) => t + u.para, 0);
  lines.push(`\n💰 **TOPLAM DAĞITILACAK BONUS:** ${toplam.toLocaleString()}$`);

  return lines;
}

/* =======================
   📤 GÜVENLİ MESAJ BÖLME
======================= */
async function sonucuGuncelle(channel) {

  const lines = sonucMetniOlustur();
  let messages = [];
  let current = "";

  for (const line of lines) {
    if ((current + line).length > 1900) {
      messages.push(current);
      current = line;
    } else {
      current += line;
    }
  }

  if (current.length > 0) messages.push(current);

  // Edit veya gönder
  for (let i = 0; i < messages.length; i++) {

    if (sonucMesajIds[i]) {
      const msg = await channel.messages.fetch(sonucMesajIds[i]);
      await msg.edit(messages[i]);
    } else {
      const newMsg = await channel.send(messages[i]);
      sonucMesajIds.push(newMsg.id);
    }
  }

  // Fazla eski mesajları sil
  if (sonucMesajIds.length > messages.length) {
    for (let i = messages.length; i < sonucMesajIds.length; i++) {
      const msg = await channel.messages.fetch(sonucMesajIds[i]);
      await msg.delete().catch(() => {});
    }
    sonucMesajIds = sonucMesajIds.slice(0, messages.length);
  }
}

/* =======================
   📩 KOMUTLAR
======================= */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    const komut = message.content.split(" ")[0];

    const yetkili = await message.guild.members.fetch(message.author.id);
    if (!yetkili.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id)))
      return;

    /* =======================
       💳 PAID / UNPAID
    ======================= */
    if (komut === "!paid" || komut === "!unpaid") {

      const hedef = message.mentions.members.first();
      if (!hedef) return message.reply("❌ Kişi etiketle.");

      const kayit = aktifSonucData.find(x => x.id === hedef.id);
      if (!kayit) return message.reply("❌ Bu kişi listede yok.");

      kayit.paid = komut === "!paid";

      await sonucuGuncelle(message.channel);
      return message.delete().catch(() => {});
    }

    /* =======================
       🧮 BONUSHESAPLA
    ======================= */
    if (komut !== "!bonushesapla") return;

    let tumMesajlar = [];
    let lastId = null;
    let bulundu = false;

    while (!bulundu) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const fetched = await message.channel.messages.fetch(options);
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

    const data = new Map();

    for (const msg of tumMesajlar) {
      if (msg.author.bot) continue;
      if (!msg.attachments.size) continue;

      const key = normalizeIsim(msg.author.username);

      if (!data.has(key)) {
        data.set(key, {
          id: msg.author.id,
          tag: `<@${msg.author.id}>`,
          katilim: 0,
          kill: 0,
          paid: false
        });
      }

      const user = data.get(key);
      user.katilim += msg.attachments.size;

      for (const satir of msg.content.split("\n")) {
        const match = satir.match(/(\d{1,2})\s*(k|kill|kills)/i);
        if (match) {
          const k = parseInt(match[1]);
          if (k > 0 && k <= 50) user.kill += k;
        }
      }
    }

    const sonucList = [...data.values()].map(u => ({
      ...u,
      para: u.katilim * KATILIM_UCRETI + u.kill * KILL_UCRETI
    }));

    sonucList.sort((a, b) => b.para - a.para);
    aktifSonucData = sonucList;

    await sonucuGuncelle(message.channel);

  } catch (err) {
    console.error("❌ HATA:", err);
    message.reply("❌ Bir hata oluştu.");
  }
});

client.login(process.env.DISCORD_TOKEN);
