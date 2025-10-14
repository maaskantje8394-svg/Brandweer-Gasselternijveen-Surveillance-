import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import express from "express";
import fs from "fs";

// === EXPRESS UPTIME SERVER ===
const app = express();
const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => res.send("Bot draait prima."));
app.listen(PORT, () => console.log(`Express server draait op poort ${PORT}`));

// === DISCORD CLIENT ===
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// === CONFIG ===
const TOKEN = process.env.TOKEN;
const MAIN_CHANNEL = "1424777371092910181";
const BEHEER_ROLE = "1355971325700739143";
const LG_ROLES = ["1427017418122723379", "1427019646665490472"];
const MARKETING_ROLE = "1424424991797154003";
const DATA_FILE = "./marketing_data.json";

// Data opslaan
let marketingData = {};
if (fs.existsSync(DATA_FILE)) {
  marketingData = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(marketingData, null, 2));
}

// === READY EVENT ===
client.on("ready", () => {
  console.log(`✅ Ingelogd als ${client.user.tag}`);
});

// === COMMAND HANDLER ===
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!") || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // === ROLE CHECKS ===
  const isBeheer = message.member.roles.cache.has(BEHEER_ROLE);
  const isLG = LG_ROLES.some((r) => message.member.roles.cache.has(r));
  const isMarketing = message.member.roles.cache.has(MARKETING_ROLE);

  // === MAIN EMBED UPDATE FUNCTIE ===
  async function updateMainEmbed() {
    const channel = await client.channels.fetch(MAIN_CHANNEL);
    const total = Object.values(marketingData).reduce((a, b) => a + b, 0);

    const sorted = Object.entries(marketingData).sort((a, b) => b[1] - a[1]);
    const description = sorted
      .map(([id, value]) => `<@${id}>: <:Robux_2019_Logo_gold:1424127061060091984> ${value}`)
      .join("\n===================\n");

    const embed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("💼 | Uitbetaling Marketing Leden")
      .setDescription(
        `Marketing leden:\n\n${description}\n\n**In totaal:** <:Robux_2019_Logo_gold:1424127061060091984> ${total}\n\nMarketing uitbetalingen \`Oktober\`\nUitbetaling op \`01-11-2025\``
      )
      .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg")
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });

    const messages = await channel.messages.fetch({ limit: 10 });
    const mainMsg = messages.find((m) => m.author.id === client.user.id);
    if (mainMsg) await mainMsg.edit({ embeds: [embed] });
    else await channel.send({ embeds: [embed] });
  }

  // === !collega add ===
  if (command === "collega" && args[0] === "add") {
    if (!isLG && !isBeheer) return message.reply("Je hebt geen toegang tot dit commando.");
    const user = message.mentions.users.first();
    const robux = parseInt(args[2]);
    if (!user || isNaN(robux)) return message.reply("Gebruik: `!collega add @user <bedrag>`");

    if (!marketingData[user.id]) marketingData[user.id] = 0;
    marketingData[user.id] += robux;
    saveData();
    await updateMainEmbed();
    return message.react("✅");
  }

  // === !collega ontslaan ===
  if (command === "collega" && args[0] === "ontslagen") {
    if (!isLG && !isBeheer) return message.reply("Je hebt geen toegang tot dit commando.");
    const user = message.mentions.users.first();
    if (!user) return message.reply("Gebruik: `!collega ontslagen @user`");
    delete marketingData[user.id];
    saveData();
    await updateMainEmbed();
    return message.react("🗑️");
  }

  // === !reset ===
  if (command === "reset") {
    if (!isBeheer) return message.reply("Alleen beheer mag dit doen.");
    marketingData = {};
    saveData();
    await updateMainEmbed();
    return message.reply("Alles is gereset.");
  }

  // === !totaal ===
  if (command === "totaal") {
    if (!isMarketing && !isLG && !isBeheer) return message.reply("Alleen marketingleden mogen dit zien.");
    const totaal = marketingData[message.author.id] || 0;
    const embed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("💸 | Jouw totaal")
      .setDescription(`Je hebt momenteel **<:Robux_2019_Logo_gold:1424127061060091984> ${totaal}** verdiend.`)
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  // === !top ===
  if (command === "top") {
    if (!isMarketing && !isLG && !isBeheer) return message.reply("Alleen marketingleden mogen dit zien.");
    const sorted = Object.entries(marketingData).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const desc = sorted
      .map(([id, val], i) => `**${i + 1}.** <@${id}> - <:Robux_2019_Logo_gold:1424127061060091984> ${val}`)
      .join("\n");
    const embed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("🏆 | Top 5 Marketing")
      .setDescription(desc || "Nog geen data beschikbaar.")
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  // === !help ===
  if (command === "help" || command === "hulp") {
    const embed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("📋 | BGS Command Lijst")
      .setDescription(
        `**Marketing & Beheer:**  
\`!collega add @user <bedrag>\`  
\`!collega ontslagen @user\`  
\`!reset\`  
\`!totaal\`  
\`!top\`  

**Algemene Commands:**  
\`!prijzen\`  
\`!membercount\`  
\`!partnerbericht\`  
\`!eisen\``
      )
      .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg")
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  // === NIEUWE COMMANDS ===

  // 1️⃣ !prijzen
  if (command === "prijzen") {
    const prijzenEmbed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("💰 | Marketing Prijzen")
      .setDescription(
        `**Junior Marketing**\n
20-250 leden: <:Robux_2019_Logo_gold:1424127061060091984> 5  
250-500 leden: <:Robux_2019_Logo_gold:1424127061060091984> 10  
500-750 leden: <:Robux_2019_Logo_gold:1424127061060091984> 15  
750-1000+ leden: <:Robux_2019_Logo_gold:1424127061060091984> 20  

**Marketing**\n
20-250 leden: <:Robux_2019_Logo_gold:1424127061060091984> 10  
250-500 leden: <:Robux_2019_Logo_gold:1424127061060091984> 15  
500-750 leden: <:Robux_2019_Logo_gold:1424127061060091984> 20  
750-1000+ leden: <:Robux_2019_Logo_gold:1424127061060091984> 25  

**Senior Marketing**\n
20-250 leden: <:Robux_2019_Logo_gold:1424127061060091984> 15  
250-500 leden: <:Robux_2019_Logo_gold:1424127061060091984> 20  
500-750 leden: <:Robux_2019_Logo_gold:1424127061060091984> 25  
750-1000+ leden: <:Robux_2019_Logo_gold:1424127061060091984> 30`
      )
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [prijzenEmbed] });
  }

  // 2️⃣ !membercount (openbaar)
  if (command === "membercount") {
    const count = message.guild.memberCount;
    const embed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("👥 | Aantal Leden")
      .setDescription(`De server heeft momenteel **${count} leden**.`)
      .setFooter({ text: "Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  // 3️⃣ !partnerbericht
  if (command === "partnerbericht") {
    const bericht = `**🚒 | Brandweer Gasselternijveen Surveillance© | 🚒**

Welkom bij BGS een Brandweer Surveillance server die zich afspeelt in het mooie plaatsje Gasselternijveen. Wij richten ons op de eenheid brandweer.  

> Wat hebben wij te bieden?

🔥 Leuk StaffTeam  
🤩 1:1 Map (In de maak)  
✨ Actieve server  
😎 Je kan altijd een intake doen  

> Wat zoeken wij nog?

🛠️ Developers  
🚨 Leden die mee willen doen aan onze Surveillance game  
🦺 Marketing Leden  
🫵 Jouw natuurlijk!

**Heb je interesse gekregen? Join nu!**
https://discord.gg/zUMXPh3aBH`;
    const embed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("📢 | Partnerbericht")
      .setDescription(`${bericht}\n\n_Kopieer dit bericht om te gebruiken bij partners._`)
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  // 4️⃣ !eisen
  if (command === "eisen") {
    const eisenEmbed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("📜 | Partner Eisen BGS")
      .setDescription(
        `**Partner eisen BGS**\n
\`Minimaal 15 members\`\n
\`Je blijft in de server\`\n
\`Je server heeft geen NSFW content\`\n
> Als je akkoord gaat, stuur je bericht maar door!\n\n
https://media.discordapp.net/attachments/1355967166461116678/1425519432913915956/image.png`
      )
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [eisenEmbed] });
  }
});

client.login(TOKEN);
