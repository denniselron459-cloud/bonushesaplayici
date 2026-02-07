const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  console.log("MESAJ ALGILANDI:", message.content);

  if (message.content === "!ping") {
    message.reply("🏓 Pong!");
  }
});

client.login(process.env.DISCORD_TOKEN);
