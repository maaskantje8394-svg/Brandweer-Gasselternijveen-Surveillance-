import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import fs from "fs-extra";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Config
const TOKEN = process.env.TOKEN;
const STATS_CHANNEL = "1427227765995995198"; // Hoofdembed
const LOG_CHANNEL = "1427229712668819516"; // Marketing Log
const PARTNER_LOG_CHANNEL = "1427237156061184030"; // Partner log
const DATA_FILE = "./data.json";

// Rollen IDs
const MANAGER_ROLE_ID = "1390083849849143420"; // Marketing managers
const TICKET_ROLE_ID = "1390083849843419"; // Ticket managers

// Beheerde users
let MANAGED_USERS = [
  "1375552459723902976",
  "1189931854657224858",
  "952959834259587153",
  "1025073640150143066"
];

// Load or initialize data
let data = {};
if (fs.existsSync(DATA_FILE)) {
  data = fs.readJsonSync(DATA_FILE);
} else {
  MANAGED_USERS.forEach(id => data[id] = 0);
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

// Helper: Save data
function saveData() {
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

// Helper: Check manager
function isManager(member) {
  return member.roles.cache.has(MANAGER_ROLE_ID);
}

// Helper: Check ticket manager
function isTicketManager(member) {
  return member.roles.cache.has(TICKET_ROLE_ID);
}

// Helper: Generate main embed
function generateMainEmbed() {
  const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const description = sortedEntries.map(([id, amount]) => `<@${id}>: :Robux_2019_Logo_gold: ${amount}\n===================`).join("\n");
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  const embed = new EmbedBuilder()
    .setColor("#dc3004")
    .setTitle("Uitbetaling Marketing Leden.")
    .setDescription(`${description}\n**In totaal: :Robux_2019_Logo_gold: ${total}**\n\nMarketing uitbetalingen \`Oktober\`\nUitbetaling op \`01-11-2025\``)
    .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg?ex=68ee16e8&is=68ecc568&hm=66e14498c0690680de82c031b96ba72778b4ed91274596c5c5c74357dfae89cd&=&format=webp&width=882&height=171")
    .setFooter({ text: "MarketingTeam  Brandweer Gasselternijveen Surveillance." });

  return embed;
}

// Update main embed
let mainMessage;
async function updateMainEmbed(channel) {
  const embed = generateMainEmbed();
  if (!mainMessage) {
    mainMessage = await channel.send({ embeds: [embed] });
  } else {
    await mainMessage.edit({ embeds: [embed] });
  }
}

// Ready
client.once("ready", async () => {
  console.log(`Ingelogd als ${client.user.tag}`);
  const channel = await client.channels.fetch(STATS_CHANNEL);
  await updateMainEmbed(channel);
});

// Commands
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const statsChannel = await client.channels.fetch(STATS_CHANNEL);
  const logChannel = await client.channels.fetch(LOG_CHANNEL);
  const partnerLogChannel = await client.channels.fetch(PARTNER_LOG_CHANNEL);

  // ------------------- Marketing Manager Commands -------------------
  if (isManager(message.member)) {

    if (command === "collega") {
      const sub = args[0];
      const userId = args[1]?.replace(/[<@!>]/g, "");
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
          MANAGED_USERS = MANAGED_USERS.filter(id => id !== userId);
          delete data[userId];
          saveData();
          await updateMainEmbed(statsChannel);
          return message.reply(`✅ <@${userId}> is ontslagen.`);
        } else return message.reply("Deze gebruiker staat niet in de lijst.");
      }
    }

    if (command === "log") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[1] || args[0]);
      if (!user || isNaN(amount)) return message.reply("Gebruik: !log @user <aantal>");
      if (!MANAGED_USERS.includes(user.id)) return message.reply("Deze gebruiker wordt niet beheerd.");

      data[user.id] = (data[user.id] || 0) + amount;
      saveData();
      await updateMainEmbed(statsChannel);

      const logEmbed = new EmbedBuilder()
        .setTitle("Marketing Log")
        .setColor("#00ff00")
        .setDescription(`✅ **${message.author.tag}** voegde ${amount} Robux toe aan <@${user.id}> (totaal: ${data[user.id]})`)
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });

      return message.reply(`✅ ${user.tag} is bijgewerkt!`);
    }

    if (command === "set") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[1] || args[0]);
      if (!user || isNaN(amount)) return message.reply("Gebruik: !set @user <aantal>");
      if (!MANAGED_USERS.includes(user.id)) return message.reply("Deze gebruiker wordt niet beheerd.");

      data[user.id] = amount;
      saveData();
      await updateMainEmbed(statsChannel);

      const logEmbed = new EmbedBuilder()
        .setTitle("Marketing Log")
        .setColor("#FFA500")
        .setDescription(`⚙️ **${message.author.tag}** zette <@${user.id}> op ${amount} Robux`)
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });

      return message.reply(`✅ ${user.tag} is ingesteld!`);
    }

    if (command === "reset") {
      MANAGED_USERS.forEach(id => data[id] = 0);
      saveData();
      await updateMainEmbed(statsChannel);

      const logEmbed = new EmbedBuilder()
        .setTitle("Marketing Log")
        .setColor("#FF0000")
        .setDescription(`🧹 **${message.author.tag}** reset alle Robux`)
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });

      return message.reply("✅ Alle Robux zijn gereset!");
    }

    if (command === "top") {
      const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
      const top5 = sorted.slice(0, 5).map(([id, amt], idx) => `**${idx + 1}.** <@${id}> - ${amt} Robux`).join("\n");
      const topEmbed = new EmbedBuilder()
        .setTitle("🏆 Top 5 Marketing Leden")
        .setColor("#00FFFF")
        .setDescription(top5);
      return message.channel.send({ embeds: [topEmbed] });
    }

    if (command === "recreate") {
      mainMessage = null;
      await updateMainEmbed(statsChannel);
      return message.reply("✅ Hoofdembed is hersteld!");
    }

    if (command === "build") {
      MANAGED_USERS.forEach(id => {
        if (!data[id]) data[id] = 0;
      });
      saveData();
      await updateMainEmbed(statsChannel);

      const logEmbed = new EmbedBuilder()
        .setTitle("Marketing Build")
        .setColor("#00BFFF")
        .setDescription(`🛠 **${message.author.tag}** heeft de hoofdembed opnieuw opgebouwd.`)
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });

      return message.reply("✅ Hoofdembed is opnieuw opgebouwd!");
    }

    if (command === "help") {
      const helpEmbed = new EmbedBuilder()
        .setTitle("Marketing Bot Commands")
        .setColor("#00FFFF")
        .setDescription(`
**Collega Commands**
!collega add @user - Voeg collega toe
!collega ontslaan @user - Verwijder collega
!log @user <Robux> - Voeg Robux toe
!set @user <Robux> - Zet Robux totaal
!reset - Reset alle totals
!top - Top 5 overzicht
!recreate - Herstel hoofdembed
!build - Rebuild hoofdembed
!totaal - Zie je eigen totaal
!add partner @user - Partner toevoegen in partner log
!logpartner @user <server> <Robux> - Voeg Robux toe (Ticket rol)
!bericht - Stuur welkomsbericht
`);
      return message.channel.send({ embeds: [helpEmbed] });
    }
  }

  // ------------------- Ticket Manager Commands -------------------
  if (isTicketManager(message.member)) {
    if (command === "logpartner") {
      const user = message.mentions.users.first();
