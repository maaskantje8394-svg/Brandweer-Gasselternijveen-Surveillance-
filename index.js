import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import fs from "fs-extra";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Config
const TOKEN = process.env.TOKEN;
const GUILD_ID = "jouw-server-id"; // optioneel
const STATS_CHANNEL = "1427227765995995198"; // hoofdembed kanaal
const LOG_CHANNEL = "1427229712668819516"; // log kanaal
const DATA_FILE = "./data.json";
const MANAGER_ROLES = ["L.G Marketing", "ASS Marketing"];
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

// Helper: Check if user is manager
function isManager(member) {
  return member.roles.cache.some(r => MANAGER_ROLES.includes(r.name));
}

// Helper: Generate main embed
function generateMainEmbed() {
  // Create array of entries sorted by Robux descending
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

// Helper: Send or update main embed
let mainMessage;
async function updateMainEmbed(channel) {
  const embed = generateMainEmbed();
  if (!mainMessage) {
    mainMessage = await channel.send({ embeds: [embed] });
  } else {
    await mainMessage.edit({ embeds: [embed] });
  }
}

// Ready event
client.once("ready", async () => {
  console.log(`Ingelogd als ${client.user.tag}`);
  const channel = await client.channels.fetch(STATS_CHANNEL);
  await updateMainEmbed(channel);
});

// Message handling
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;
  if (!isManager(message.member)) {
    return message.reply({ content: "❌ Je hebt geen toestemming om dit command te gebruiken.", ephemeral: true });
  }

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const logChannel = await client.channels.fetch(LOG_CHANNEL);
  const statsChannel = await client.channels.fetch(STATS_CHANNEL);

  if (command === "log") {
    const user = message.mentions.users.first();
    const amount = parseInt(args[1] || args[0]);
    if (!user || isNaN(amount)) return message.reply("Gebruik: !log @user <aantal>");
    if (!MANAGED_USERS.includes(user.id)) return message.reply("Deze gebruiker wordt niet beheerd.");

    data[user.id] = (data[user.id] || 0) + amount;
    saveData();
    await updateMainEmbed(statsChannel);

    // Log embed
    const logEmbed = new EmbedBuilder()
      .setTitle("Marketing Log")
      .setColor("#00ff00")
      .setDescription(`✅ **${message.author.tag}** voegde ${amount} Robux toe aan <@${user.id}> (totaal: ${data[user.id]})`)
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] });

    // Milestone
    if (data[user.id] >= 1000 && data[user.id] - amount < 1000) {
      const milestone = new EmbedBuilder()
        .setTitle("🎉 Mijlpaal!")
        .setColor("#FFD700")
        .setDescription(`<@${user.id}> heeft 1000 Robux bereikt!`);
      await logChannel.send({ embeds: [milestone] });
    }

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

  if (command === "partner") {
    const sub = args[0];
    const userId = args[1];
    if (!userId) return message.reply("Gebruik: !partner add/remove <userID>");
    if (sub === "add") {
      if (!MANAGED_USERS.includes(userId)) {
        MANAGED_USERS.push(userId);
        data[userId] = 0;
        saveData();
        await updateMainEmbed(statsChannel);
        return message.reply(`✅ <@${userId}> toegevoegd aan partners.`);
      } else {
        return message.reply("Deze gebruiker staat al in de lijst.");
      }
    } else if (sub === "remove") {
      if (MANAGED_USERS.includes(userId)) {
        MANAGED_USERS = MANAGED_USERS.filter(id => id !== userId);
        delete data[userId];
        saveData();
        await updateMainEmbed(statsChannel);
        return message.reply(`✅ <@${userId}> verwijderd uit partners.`);
      } else {
        return message.reply("Deze gebruiker staat niet in de lijst.");
      }
    }
  }
});

client.login(TOKEN);
