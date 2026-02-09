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
  try {
    if (message.author.bot || !message.guild) return;
    if (message.content !== "!bonushesapla") return;

    const yetkili = await message.guild.members.fetch(message.author.id);
    if (!yetkili.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id))) {
      return message.reply("❌ Bu komutu kullanamazsın.");
    }

    /* =======================
       📥 REFERANS ALTINI TEK SEFERDE AL
    ======================= */
    const fetched = await message.channel.messages.fetch({
      limit: 100,
      after: REFERANS_MESAJ_ID
    });

    if (!fetched.size) {
      return message.reply("❌ Referans altında mesaj yok.");
    }

    /* =======================
       📊 SADECE BIZZWAR KILL
    ======================= */
    const playerMap = new Map();

    for (const msg of fetched.values()) {
      if (msg.author.bot) continue;
      if (!msg.content.toUpperCase().includes("BIZZWAR")) continue;

      for (const line of msg.content.split("\n")) {
        const match = line.match(/^<@!?(\d+)>\s+(\d+)$/);
        if (!match) continue;

        const userId = match[1];
        const kill = Number(match[2]);

        playerMap.set(
          userId,
          (playerMap.get(userId) || 0) + kill
        );
      }
    }

    if (!playerMap.size) {
      return message.reply("❌ Bizzwar kill bulunamadı.");
    }

    const players = [...playerMap.entries()]
      .map(([userId, kills]) => ({
        userId,
        kills,
        paid: false
      }))
      .sort((a, b) => b.kills - a.kills);

    /* =======================
       🧾 TEK EMBED
    ======================= */
    const buildEmbed = () => {
      let total = 0;

      const desc = players.map((p, i) => {
        const bonus = p.kills * KILL_UCRETI;
        total += bonus;

        return `**${i + 1}.** <@${p.userId}>
🔫 Kill: **${p.kills}**
💰 Bonus: **${bonus.toLocaleString()}$**
📌 Durum: ${p.paid ? "✅ **PAID**" : "❌ **Ödenmedi**"}`;
      }).join("\n\n");

      return new EmbedBuilder()
        .setTitle("🏆 BIZZWAR KILL BONUS DAĞITIMI")
        .setColor(players.every(p => p.paid) ? "Green" : "Red")
        .setDescription(desc)
        .setFooter({
          text: `💰 TOPLAM DAĞITILACAK BONUS: ${total.toLocaleString()}$`
        });
    };

    const buildButtons = () =>
      players.map((p, i) =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`paid_${i}`)
            .setLabel(`Paid → ${i + 1}`)
            .setStyle(p.paid ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(p.paid)
        )
      );

    const sent = await message.channel.send({
      embeds: [buildEmbed()],
      components: buildButtons()
    });

    const collector = sent.createMessageComponentCollector();

    collector.on("collect", async (interaction) => {
      const index = Number(interaction.customId.split("_")[1]);
      if (players[index].paid) return interaction.deferUpdate();

      players[index].paid = true;

      await interaction.update({
        embeds: [buildEmbed()],
        components: buildButtons()
      });
    });

  } catch (err) {
    console.error("❌ GERÇEK HATA:", err);
    message.reply("❌ Bir hata oluştu.");
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(process.env.DISCORD_TOKEN);
