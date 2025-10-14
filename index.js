import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import fs from "fs-extra";
import express from "express";

// ---------------- EXPRESS SERVER ----------------
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is online ✅"));
app.listen(PORT, () => console.log(`Express server draait op poort ${PORT}`));

// ---------------- DISCORD ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ---------------- CONFIG ----------------
const TOKEN = process.env.TOKEN;
const MAIN_CHANNEL = "1424777371092910181"; // Eind bedrag kanaal
const DATA_FILE = "./data.json";

// Rollen
const BEHEER_ROLE = "1355971325700739143";
const LEIDING_ROLES = ["1427017418122723379", "1427019646665490472"];
const MARKETING_ROLE = "1424424991797154003";

// ---------------- DATA ----------------
let data = {
  "1189931854657224858": 400,
  "1375552459723902976": 235,
  "846391521863532604": 270,
  "1041376138829770792": 120,
  "1372670379717562480": 75,
  "1335663878683492512": 20,
  "1369407513048514591": 0,
};
let MANAGED_USERS = Object.keys(data);
if (!fs.existsSync(DATA_FILE)) fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
else data = fs.readJsonSync(DATA_FILE);

// ---------------- HELPERS ----------------
function saveData() {
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

function hasRole(member, roleIds) {
  return roleIds.some((id) => member.roles.cache.has(id));
}

function generateMainEmbed() {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const description = sorted
    .map(
      ([id, amt]) =>
        `<@${id}>: <:Robux_2019_Logo_gold:1424127061060091984> ${amt}\n===================`
    )
    .join("\n");
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return new EmbedBuilder()
    .setColor(0xdc3004)
    .setTitle("📊 Marketing Leden")
    .setDescription(
      `${description}\n**In totaal: <:Robux_2019_Logo_gold:1424127061060091984> ${total}**\n\nMarketing uitbetalingen \`Oktober\`\nUitbetaling op \`01-11-2025\``
    )
    .setImage(
      "https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg"
    )
    .setFooter({
      text: "MarketingTeam  Brandweer Gasselternijveen Surveillance.",
    });
}

let mainMessage;
async function updateMainEmbed(channel) {
  const embed = generateMainEmbed();
  if (!mainMessage) mainMessage = await channel.send({ embeds: [embed] });
  else await mainMessage.edit({ embeds: [embed] });
}

// ---------------- READY ----------------
client.once("ready", async () => {
  console.log(`Ingelogd als ${client.user.tag}`);
  const mainChannel = await client.channels.fetch(MAIN_CHANNEL);
  await updateMainEmbed(mainChannel);
});

// ---------------- COMMANDS ----------------
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const mainChannel = await client.channels.fetch(MAIN_CHANNEL);

  // ---------- LEIDING / BEHEER COMMANDS ----------
  if (hasRole(message.member, [BEHEER_ROLE, ...LEIDING_ROLES])) {
    // !collega add/ontslaan
    if (command === "collega") {
      const sub = args[0];
      const userId = args[1]?.replace(/[<@!>]/g, "");
      if (!userId) return;

      if (sub === "add" && !MANAGED_USERS.includes(userId)) {
        MANAGED_USERS.push(userId);
        data[userId] = 0;
        saveData();
        await updateMainEmbed(mainChannel);
      }

      if (sub === "ontslaan" && MANAGED_USERS.includes(userId)) {
        MANAGED_USERS = MANAGED_USERS.filter((id) => id !== userId);
        delete data[userId];
        saveData();
        await updateMainEmbed(mainChannel);
      }
    }

    // !log @user <amount>
    if (command === "log") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[1] || args[0]);
      if (!user || isNaN(amount)) return;
      if (!MANAGED_USERS.includes(user.id)) return;
      data[user.id] = (data[user.id] || 0) + amount;
      saveData();
      await updateMainEmbed(mainChannel);
    }

    // !set @user <amount>
    if (command === "set") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[1] || args[0]);
      if (!user || isNaN(amount)) return;
      if (!MANAGED_USERS.includes(user.id)) return;
      data[user.id] = amount;
      saveData();
      await updateMainEmbed(mainChannel);
    }

    // !reset
    if (command === "reset") {
      MANAGED_USERS.forEach((id) => (data[id] = 0));
      saveData();
      await updateMainEmbed(mainChannel);
    }

    // !top
    if (command === "top") {
      const top5 = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(
          ([id, amt], i) =>
            `**${i + 1}.** <@${id}> - ${amt} <:Robux_2019_Logo_gold:1424127061060091984>`
        )
        .join("\n");
      const embed = new EmbedBuilder()
        .setTitle("🏆 Top 5 Marketing Leden")
        .setColor(0x00ffff)
        .setDescription(top5);
      return message.channel.send({ embeds: [embed] });
    }

    // !recreate
    if (command === "recreate") {
      mainMessage = null;
      await updateMainEmbed(mainChannel);
    }
  }

  // ---------- MARKETING TEAM COMMANDS ----------
  if (message.member.roles.cache.has(MARKETING_ROLE)) {
    // !totaal
    if (command === "totaal") {
      const amount = data[message.author.id] || 0;
      return message.reply(
        `Je totaal Robux: ${amount} <:Robux_2019_Logo_gold:1424127061060091984>`
      );
    }

    // !top
    if (command === "top") {
      const top5 = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(
          ([id, amt], i) =>
            `**${i + 1}.** <@${id}> - ${amt} <:Robux_2019_Logo_gold:1424127061060091984>`
        )
        .join("\n");
      const embed = new EmbedBuilder()
        .setTitle("🏆 Top 5 Marketing Leden")
        .setColor(0x00ffff)
        .setDescription(top5);
      return message.channel.send({ embeds: [embed] });
    }
  }

  // ---------------- INFO COMMANDS ----------------
  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0xdc3004)
      .setTitle("🚒 Brandweer Gasselternijveen Surveillance Bot Commands")
      .setDescription("Overzicht van alle beschikbare commands")
      .setImage(
        "https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg"
      )
      .addFields(
        {
          name: "Leiding / Beheer",
          value:
            "`!collega add @user` - Voeg toe\n`!collega ontslaan @user` - Verwijder\n`!log @user <Robux>` - Voeg Robux toe\n`!set @user <Robux>` - Zet totaal\n`!reset` - Reset alles\n`!top` - Top 5\n`!recreate` - Herbouw embed",
        },
        {
          name: "Marketing Team",
          value:
            "`!totaal` - Bekijk eigen totaal\n`!top` - Top 5 overzicht\n`!prijzen` - Prijzen per niveau\n`!membercount` - Bekijk leden\n`!partnerbericht` - Partner copy bericht\n`!eisen` - Partner eisen overzicht",
        }
      )
      .setFooter({ text: "MarketingTeam  Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  // ---------------- NIEUWE COMMANDS ----------------
  if (command === "prijzen") {
    const embed = new EmbedBuilder()
      .setColor(0xdc3004)
      .setTitle("💰 Marketing Prijzen")
      .setDescription(
`**Junior Marketing**
20-250 leden: <:Robux_2019_Logo_gold:1424127061060091984> 5
250-500 leden: <:Robux_2019_Logo_gold:1424127061060091984> 10
500-750 leden: <:Robux_2019_Logo_gold:1424127061060091984> 15
750-1000+ leden: <:Robux_2019_Logo_gold:1424127061060091984> 20

**Marketing**
20-250 leden: <:Robux_2019_Logo_gold:1424127061060091984> 10
250-500 leden: <:Robux_2019_Logo_gold:1424127061060091984> 15
500-750 leden: <:Robux_2019_Logo_gold:1424127061060091984> 20
750-1000+ leden: <:Robux_2019_Logo_gold:1424127061060091984> 25

**Senior Marketing**
20-250 leden: <:Robux_2019_Logo_gold:1424127061060091984> 15
250-500 leden: <:Robux_2019_Logo_gold:1424127061060091984> 20
500-750 leden: <:Robux_2019_Logo_gold:1424127061060091984> 25
750-1000+ leden: <:Robux_2019_Logo_gold:1424127061060091984> 30`
      )
      .setFooter({ text: "MarketingTeam  Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  if (command === "membercount") {
    const embed = new EmbedBuilder()
      .setColor(0xdc3004)
      .setTitle("👥 Server Members")
      .setDescription(`Het totaal aantal leden in deze server is **${message.guild.memberCount}**.`)
      .setFooter({ text: "MarketingTeam  Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  if (command === "partnerbericht") {
    const embed = new EmbedBuilder()
      .setColor(0xdc3004)
      .setTitle("🚒 Partnerbericht")
      .setDescription(`**🚒  | Brandweer Gasselternijveen Surveillance© | 🚒**

Welkom bij BGS een Brandweer Surveillance server die zich afspeelt in het mooie plaatsje Gasselternijveen, Wij zijn een server die voornamelijk zich richt op de eenheid brandweer. 

> Wat hebben wij nou tebieden?

🔥 Leuk StaffTean
🤩 1:1 Map ( In de maak )
✨ Actiefe server
😎 Je kan altijd een intake doen

> Wat zoeken wij nog?

🛠️ Developers
🚨 Leden die mee willen doen aan onze Surveillance game
🦺 Marketing Leden
🫵 Jouw natuurlijk!

**Heb je nou interesse gekregen om mee tedoen? Join dan nu via onderstaande link!**

https://discord.gg/zUMXPh3aBH

https://cdn.discordapp.com/attachments/1356153523330423898/1424133521064067244/Schermafbeelding_2025-10-04_132129.png

https://media.discordapp.net/attachments/1364928783483670568/1425519287136817315/image.png`)
      .setFooter({ text: "MarketingTeam  Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }

  if (command === "eisen") {
    const embed = new EmbedBuilder()
      .setColor(0xdc3004)
      .setTitle("📋 Partner eisen BGS")
      .setDescription(
        "`Minimaal 15 members`\n`Je blijft in de server`\n`Je server heeft geen NSFW content`\n\n> Als je akkoord gaat stuur je bericht maar door!\n\nhttps://media.discordapp.net/attachments/1355967166461116678/1425519432913915956/image.png"
      )
      .setFooter({ text: "MarketingTeam  Brandweer Gasselternijveen Surveillance." });
    return message.channel.send({ embeds: [embed] });
  }
});

// ---------------- LOGIN ----------------
client.login(TOKEN);
