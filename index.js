import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import express from "express";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 10000;

// Uptime pinger (voor Render)
app.get("/", (req, res) => res.send("Bot draait."));
app.listen(PORT, () => console.log(`Express server draait op poort ${PORT}`));

// Discord client setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// === CONFIG ===
const TOKEN = process.env.TOKEN; // Je Render Environment Variable
const MAIN_CHANNEL = "1424777371092910181"; // Eindbedrag kanaal
const BEHEER_ROLE = "1355971325700739143";
const LG_ROLES = ["1427017418122723379", "1427019646665490472"];
const MARKETING_ROLE = "1424424991797154003";

client.on("ready", () => {
  console.log(`Ingelogd als ${client.user.tag}`);
});

// === COMMAND HANDLER ===
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!")) return;
  if (message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // === HELP ===
  if (command === "help" || command === "hulp") {
    const embed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("📋 | BGS Command Lijst")
      .setDescription(
        `**Beschikbare commands:**\n
🔸 \`!prijzen\` – Bekijk de marketing prijzen.
🔸 \`!membercount\` – Zie hoeveel leden de server heeft.
🔸 \`!partnerbericht\` – Krijg een standaard partnerbericht.
🔸 \`!eisen\` – Bekijk de partner eisen.
🔸 \`!totaal\` – Bekijk jouw totaalbedrag (alleen marketing).`
      )
      .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg")
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  // === PRIJZEN ===
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
      .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg")
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [prijzenEmbed] });
  }

  // === MEMBERCOUNT ===
  if (command === "membercount") {
    const count = message.guild.memberCount;
    const embed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("👥 | Aantal Leden")
      .setDescription(`De server heeft momenteel **${count} leden**.`)
      .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg")
      .setFooter({ text: "Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  // === PARTNER BERICHT ===
  if (command === "partnerbericht") {
    const bericht = `**🚒  | Brandweer Gasselternijveen Surveillance© | 🚒**

Welkom bij BGS een Brandweer Surveillance server die zich afspeelt in het mooie plaatsje Gasselternijveen, Wij zijn een server die voornamelijk zich richt op de eenheid brandweer. 

> Wat hebben wij nou te bieden?

🔥 Leuk StaffTeam  
🤩 1:1 Map (In de maak)  
✨ Actieve server  
😎 Je kan altijd een intake doen  

> Wat zoeken wij nog?

🛠️ Developers  
🚨 Leden die mee willen doen aan onze Surveillance game  
🦺 Marketing Leden  
🫵 Jouw natuurlijk!

**Heb je nou interesse gekregen om mee te doen? Join dan nu via onderstaande link!**

https://discord.gg/zUMXPh3aBH

https://cdn.discordapp.com/attachments/1356153253330423898/1424133521064067244/Schermafbeelding_2025-10-04_132129.png
https://media.discordapp.net/attachments/1364928783483670568/1425519287136817315/image.png`;
    const embed = new EmbedBuilder()
      .setColor(0xDC3004)
      .setTitle("📢 | Partnerbericht")
      .setDescription(`${bericht}\n\n_Kopieer dit bericht om te gebruiken bij partners._`)
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  // === PARTNER EISEN ===
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
      .setImage("https://media.discordapp.net/attachments/1355967166461116678/1425519432913915956/image.png")
      .setFooter({ text: "MarketingTeam | Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [eisenEmbed] });
  }
});

client.login(TOKEN);
