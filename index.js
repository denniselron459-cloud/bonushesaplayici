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

const YETKILI_ROL_IDS = [
  "1432722610667655362",
  "1454564464727949493"
];

const REFERANS_MESAJ_ID = "1470080051570671880";
const KILL_UCRETI = 150000;

client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot || !message.guild) return;
    if (message.content !== "!bonushesapla") return;

    const member = await message.guild.members.fetch(message.author.id);
    if (!member.roles.cache.some(r => YETKILI_ROL_IDS.includes(r.id))) {
      return message.reply("❌ Yetkin yok.");
    }

    const fetched = await message.channel.messages.fetch({
      limit: 100,
      after: REFERANS_MESAJ_ID
    });

    const players = new Map();

    for (const msg of fetched.values()) {
      if (!msg.content.toUpperCase().includes("BIZZWAR")) continue;

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
📌 Durum: ${paid ? "✅ **PAID**" : "❌ **Ödenmedi**"}`;
      }).join("\n\n");

      return new EmbedBuilder()
        .setTitle("🏆 BIZZWAR BONUS DAĞITIMI")
        .setColor(paid ? "Green" : "Red")
        .setDescription(desc)
        .setFooter({ text: `Toplam: ${total.toLocaleString()}$` });
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("paid_all")
        .setLabel("💰 Hepsini Paid Yap")
        .setStyle(ButtonStyle.Success)
        .setDisabled(paid)
    );

    const sent = await message.channel.send({
      embeds: [buildEmbed()],
      components: [row]
    });

    const collector = sent.createMessageComponentCollector();

    collector.on("collect", async (i) => {
      if (i.customId !== "paid_all") return;
      paid = true;

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

client.login(process.env.DISCORD_TOKEN);
