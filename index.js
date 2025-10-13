import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import fs from "fs-extra";
import express from "express";

// ---------------- EXPRESS SERVER ----------------
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is online ✅");
});

app.listen(PORT, () => {
  console.log(`Express server draait op poort ${PORT}`);
});

// ---------------- DISCORD BOT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ---------------- CONFIG ----------------
const TOKEN = process.env.TOKEN;
const STATS_CHANNEL = "1427227765995995198";       // Hoofdembed
const PARTNER_LOG_CHANNEL = "1427237156061184030";// Partner log
const DATA_FILE = "./data.json";

// Rollen
const MANAGER_ROLE_ID = "1390083849849143420"; // Marketing managers
const TICKET_ROLE_ID = "1390083849843419";    // Ticket managers

// Beheerde users
let MANAGED_USERS = [
  "1375552459723902976",
  "1189931854657224858",
  "952959834259587153",
  "1025073640150143066"
];

// ---------------- DATA ----------------
let data = {};
if (fs.existsSync(DATA_FILE)) data = fs.readJsonSync(DATA_FILE);
else {
  MANAGED_USERS.forEach(id => data[id] = 0);
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

// ---------------- HELPERS ----------------
function saveData() { fs.writeJsonSync(DATA_FILE, data, { spaces: 2 }); }
function isManager(member) { return member.roles.cache.has(MANAGER_ROLE_ID); }
function isTicketManager(member) { return member.roles.cache.has(TICKET_ROLE_ID); }

function generateMainEmbed() {
  const sorted = Object.entries(data).sort((a,b)=>b[1]-a[1]);
  const description = sorted.map(([id,amt])=>`<@${id}>: :Robux_2019_Logo_gold: ${amt}\n===================`).join("\n");
  const total = Object.values(data).reduce((a,b)=>a+b,0);
  return new EmbedBuilder()
    .setColor(0xDC3004)
    .setTitle("Uitbetaling Marketing Leden.")
    .setDescription(`${description}\n**In totaal: :Robux_2019_Logo_gold: ${total}**\n\nMarketing uitbetalingen \`Oktober\`\nUitbetaling op \`01-11-2025\``)
    .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg")
    .setFooter({ text: "MarketingTeam  Brandweer Gasselternijveen Surveillance." });
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
  const statsChannel = await client.channels.fetch(STATS_CHANNEL);
  await updateMainEmbed(statsChannel);
});

// ---------------- COMMANDS ----------------
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith("!")) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const statsChannel = await client.channels.fetch(STATS_CHANNEL);
  const partnerLogChannel = await client.channels.fetch(PARTNER_LOG_CHANNEL);

  // ---------------- MANAGER COMMANDS ----------------
  if (isManager(message.member)) {
    // !collega add/ontslaan
    if (command === "collega") {
      const sub = args[0];
      const userId = args[1]?.replace(/[<@!>]/g,"");
      if (!userId) return message.reply("Gebruik: !collega add/ontslaan @user");

      if (sub === "add") {
        if (!MANAGED_USERS.includes(userId)) {
          MANAGED_USERS.push(userId);
          data[userId] = 0;
          saveData();
          await updateMainEmbed(statsChannel);
          return message.reply(`✅ <@${userId}> toegevoegd als collega.`);
        } else return message.reply("Deze gebruiker staat al in de lijst.");
      }
      if (sub === "ontslaan") {
        if (MANAGED_USERS.includes(userId)) {
          MANAGED_USERS = MANAGED_USERS.filter(id=>id!==userId);
          delete data[userId];
          saveData();
          await updateMainEmbed(statsChannel);
          return message.reply(`✅ <@${userId}> is ontslagen.`);
        } else return message.reply("Deze gebruiker staat niet in de lijst.");
      }
    }

    // !set
    if (command === "set") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[1]||args[0]);
      if (!user || isNaN(amount)) return message.reply("Gebruik: !set @user <aantal>");
      if (!MANAGED_USERS.includes(user.id)) return message.reply("Deze gebruiker wordt niet beheerd.");
      data[user.id] = amount;
      saveData();
      await updateMainEmbed(statsChannel);
      return message.reply(`✅ <@${user.id}> is ingesteld op ${amount} Robux!`);
    }

    // !reset
    if (command === "reset") {
      MANAGED_USERS.forEach(id=>data[id]=0);
      saveData();
      await updateMainEmbed(statsChannel);
      return message.reply("✅ Alle Robux zijn gereset!");
    }

    // !help
    if (command === "help") {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🚒 Brandweer Gasselternijveen Surveillance Bot Commands")
        .setDescription("Overzicht van alle beschikbare commands")
        .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg")
        .addFields(
          { name: "Collega Commands", value: "`!collega add @user` - Voeg collega toe\n`!collega ontslaan @user` - Verwijder collega\n`!set @user <Robux>` - Zet totaal\n`!reset` - Reset alle totals", inline:false },
          { name: "Ticket Commands", value: "`!totaal` - Bekijk eigen totaal\n`!logpartner @user <server> <leden> <Robux>` - Voeg Robux toe (Ticket rol)", inline:false }
        )
        .setFooter({ text:"MarketingTeam  Brandweer Gasselternijveen Surveillance." });
      return message.channel.send({ embeds:[embed] });
    }
  }

  // ---------------- TICKET COMMANDS ----------------
  if (isTicketManager(message.member)) {
    // !logpartner
    if (command === "logpartner") {
      const user = message.mentions.users.first();
      if (!user) return message.reply("Gebruik: !logpartner @user <server> <leden> <Robux>");

      const membersCount = parseInt(args[args.length-2]);
      const robux = parseInt(args[args.length-1]);
      const serverName = args.slice(0, args.length-2).join(" ").replace(/"/g,"");

      if (!serverName || isNaN(membersCount) || isNaN(robux)) {
        return message.reply("Gebruik: !logpartner @user <server> <leden> <Robux>");
      }

      data[user.id] = (data[user.id] || 0) + robux;
      saveData();

      const embed = new EmbedBuilder()
        .setTitle("📌 Partner Log")
        .setColor(0xFF0000)
        .addFields(
          { name: "Naam server", value: serverName, inline: false },
          { name: "Leden server", value: membersCount.toString(), inline: true },
          { name: "Robux", value: robux.toString(), inline: true }
        )
        .setFooter({ text: `-# door ${message.author.tag}` })
        .setTimestamp();

      await partnerLogChannel.send({ embeds: [embed] });
      await updateMainEmbed(statsChannel);
      return message.reply(`✅ ${user.tag} bijgewerkt in partner log!`);
    }

    // !totaal
    if (command==="totaal") {
      const amount = data[message.author.id] || 0;
      return message.reply(`Je totaal Robux: ${amount}`);
    }
  }
});

// ---------------- LOGIN ----------------
client.login(TOKEN);
