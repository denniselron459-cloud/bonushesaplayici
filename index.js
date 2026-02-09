const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require("discord.js");

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

const REFERANS_MESAJ_ID = "1470080051570671880";
const KILL_UCRETI = 150000;

/* =======================
   🚀 READY
======================= */
client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

/* =======================
   📩 KOMUT
======================= */
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  if (message.content !== "!bonushesapla") return;

  try {
    const yetkili = await message.guild.members.fetch(message.author.id);
    if (!yetkili.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id))) {
      return message.reply("❌ Yetkin yok.");
    }

    const msgs = await message.channel.messages.fetch({
      limit: 100,
      after: REFERANS_MESAJ_ID
    });

    const players = new Map();

    for (const msg of msgs.values()) {
      for (const line of msg.content.split("\n")) {
        const match = line.match(/^<@!?(\d+)>\s+(\d+)$/);
        if (!match) continue;

        const id = match[1];
        const kill = Number(match[2]);

        players.set(id, (players.get(id) || 0) + kill);
      }
    }

    if (!players.size) {
      return message.reply("❌ Kill bulunamadı.");
    }

    let paid = false;

    const buildEmbed = () => {
      let total = 0;

      const desc = [...players.entries()].map(([id, kill], i) => {
        const bonus = kill * KILL_UCRETI;
        total += bonus;

        return `**${i + 1}.** <@${id}>
🔫 Kill: **${kill}**
💰 Bonus: **${bonus.toLocaleString()}$**
📌 Durum: ${paid ? "✅ PAID" : "❌ Ödenmedi"}`;
      }).join("\n\n");

      return new EmbedBuilder()
        .setTitle("🏆 BIZZWAR BONUS DAĞITIMI")
        .setColor(paid ? 0x2ecc71 : 0xe74c3c)
        .setDescription(desc)
        .setFooter({ text: `Toplam: ${total.toLocaleString()}$` });
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("paid_all")
        .setLabel("💰 Hepsini Paid Yap")
        .setStyle(ButtonStyle.Success)
    );

    const sent = await message.channel.send({
      embeds: [buildEmbed()],
      components: [row]
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000 // ⏱️ 10 dk
    });

    collector.on("collect", async (i) => {
      if (i.customId !== "paid_all") return;

      paid = true;
      collector.stop();

      await i.update({
        embeds: [buildEmbed()],
        components: []
      });
    });

  } catch (err) {
    console.error("❌ HATA:", err);
    message.reply("❌ Bir hata oluştu.");
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(process.env.DISCORD_TOKEN);

/* =======================
   🧠 RAILWAY KEEP ALIVE
======================= */
setInterval(() => {}, 1000);
