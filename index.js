const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();

/* ================== AYARLAR ================== */
const GUILD_ID = "1426928763857404077";
const KILL_CHANNEL_ID = "1426947227208908850";
const RESULT_CHANNEL_ID = "1426947227208908850";
const BONUS_PER_KILL = 150000;
/* ============================================= */

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN yok");
  process.exit(1);
}

/* ================== DATABASE ================== */
const db = new sqlite3.Database("./bonus.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS kills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      killer TEXT,
      time INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
});

/* ================== CLIENT ================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

/* ================== KILL OKUMA ================== */
client.on("messageCreate", (message) => {
  if (message.channel.id !== KILL_CHANNEL_ID) return;
  if (message.author.bot) return;

  // örnek: Dennis killed Ahmet
  const match = message.content.match(/^(.+?)\s+(killed|→)\s+/i);
  if (!match) return;

  const killer = match[1].trim();
  db.run(
    "INSERT INTO kills (killer, time) VALUES (?, ?)",
    [killer, Date.now()]
  );
});

/* ================== ETİKET BUL ================== */
async function etiketBul(guild, isim) {
  await guild.members.fetch();

  const lower = isim.toLowerCase();

  const member = guild.members.cache.find((m) =>
    [m.user.username, m.user.globalName, m.nickname]
      .filter(Boolean)
      .some((n) => n.toLowerCase() === lower)
  );

  return member ? `<@${member.id}>` : isim;
}

/* ================== BONUS HESAPLAMA ================== */
async function bonuslariHesapla() {
  db.get("SELECT value FROM meta WHERE key='last_calc'", async (_, row) => {
    const lastCalc = row ? Number(row.value) : 0;

    db.all(
      "SELECT killer, COUNT(*) as kill FROM kills WHERE time > ? GROUP BY killer",
      [lastCalc],
      async (_, rows) => {
        if (!rows || rows.length === 0) return;

        const guild = await client.guilds.fetch(GUILD_ID);

        let desc = "";
        let toplam = 0;

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const etiket = await etiketBul(guild, r.killer);
          const para = r.kill * BONUS_PER_KILL;
          toplam += para;

          desc += `**${i + 1}.** ${etiket} → ${r.kill} kill • **${para.toLocaleString()}$**\n`;
        }

        const embed = new EmbedBuilder()
          .setTitle("💰 BizzWar Bonus Sonuçları")
          .setDescription(desc)
          .setFooter({
            text: `Toplam Dağıtılan: ${toplam.toLocaleString()}$`,
          })
          .setColor("Gold")
          .setTimestamp();

        const channel = await client.channels.fetch(RESULT_CHANNEL_ID);
        await channel.send({ embeds: [embed] });

        db.run(
          "INSERT OR REPLACE INTO meta (key,value) VALUES ('last_calc',?)",
          [Date.now()]
        );
      }
    );
  });
}

/* ================== BOT AÇILDI ================== */
client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
  bonuslariHesapla(); // 🔥 ŞİMDİ HESAPLA
});

client.login(process.env.DISCORD_TOKEN);
