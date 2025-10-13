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

// ---------------- CONFIG ----------------
const TOKEN = process.env.TOKEN;
const STATS_CHANNEL = "1427227765995995198";
const LOG_CHANNEL = "1427229712668819516";
const PARTNER_LOG_CHANNEL = "1427237156061184030";
const DATA_FILE = "./data.json";

// Rollen
const MANAGER_ROLE_ID = "1390083849849143420";
const TICKET_ROLE_ID = "1390083849843419";

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
    .setColor("#dc3004")
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
  const logChannel = await client.channels.fetch(LOG_CHANNEL);
  const partnerLogChannel = await client.channels.fetch(PARTNER_LOG_CHANNEL);

  // ---------------- MANAGER COMMANDS ----------------
  if (isManager(message.member)) {
    // !collega
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

    // !log
    if (command === "log") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[1]||args[0]);
      if (!user || isNaN(amount)) return message.reply("Gebruik: !log @user <aantal>");
      if (!MANAGED_USERS.includes(user.id)) return message.reply("Deze gebruiker wordt niet beheerd.");
      data[user.id] = (data[user.id]||0)+amount;
      saveData();
      await updateMainEmbed(statsChannel);
      const embed = new EmbedBuilder()
        .setTitle("Marketing Log")
        .setColor("#00ff00")
        .setDescription(`✅ **${message.author.tag}** voegde ${amount} Robux toe aan <@${user.id}> (totaal: ${data[user.id]})`)
        .setTimestamp();
      await logChannel.send({ embeds:[embed] });
      return message.reply(`✅ ${user.tag} is bijgewerkt!`);
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
      const embed = new EmbedBuilder()
        .setTitle("Marketing Log")
        .setColor("#FFA500")
        .setDescription(`⚙️ **${message.author.tag}** zette <@${user.id}> op ${amount} Robux`)
        .setTimestamp();
      await logChannel.send({ embeds:[embed] });
      return message.reply(`✅ ${user.tag} is ingesteld!`);
    }

    // !reset
    if (command === "reset") {
      MANAGED_USERS.forEach(id=>data[id]=0);
      saveData();
      await updateMainEmbed(statsChannel);
      const embed = new EmbedBuilder()
        .setTitle("Marketing Log")
        .setColor("#FF0000")
        .setDescription(`🧹 **${message.author.tag}** reset alle Robux`)
        .setTimestamp();
      await logChannel.send({ embeds:[embed] });
      return message.reply("✅ Alle Robux zijn gereset!");
    }

    // !top
    if (command === "top") {
      const top5 = Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,5)
                    .map(([id,amt],i)=>`**${i+1}.** <@${id}> - ${amt} Robux`).join("\n");
      const embed = new EmbedBuilder()
        .setTitle("🏆 Top 5 Marketing Leden")
        .setColor("#00FFFF")
        .setDescription(top5);
      return message.channel.send({ embeds:[embed] });
    }

    // !recreate
    if (command === "recreate") {
      mainMessage = null;
      await updateMainEmbed(statsChannel);
      return message.reply("✅ Hoofdembed is hersteld!");
    }

    // !build
    if (command === "build") {
      MANAGED_USERS.forEach(id=>{ if(!data[id]) data[id]=0; });
      saveData();
      await updateMainEmbed(statsChannel);
      const embed = new EmbedBuilder()
        .setTitle("Marketing Build")
        .setColor("#00BFFF")
        .setDescription(`🛠 **${message.author.tag}** heeft de hoofdembed opnieuw opgebouwd.`)
        .setTimestamp();
      await logChannel.send({ embeds:[embed] });
      return message.reply("✅ Hoofdembed is opnieuw opgebouwd!");
    }

    // !help
    if (command==="help") {
      const embed = new EmbedBuilder()
        .setTitle("Marketing Bot Commands")
        .setColor("#00FFFF")
        .setDescription(`
**Collega Commands**
!collega add @user - Voeg collega toe
!collega ontslaan @user - Verwijder collega
!log @user <Robux> - Voeg Robux toe
!set @user <Robux> - Zet totaal
!reset - Reset alle totals
!top - Top 5 overzicht
!recreate - Herstel hoofdembed
!build - Rebuild hoofdembed

**Ticket Commands**
!totaal - Bekijk eigen totaal
!add partner @user - Partner toevoegen in partner log
!logpartner @user <server> <Robux> - Voeg Robux toe (Ticket rol)
!bericht - Stuur welkomsbericht
`);
      return message.channel.send({ embeds:[embed] });
    }
  }

  // ---------------- TICKET COMMANDS ----------------
  if (isTicketManager(message.member)) {

    // !logpartner
    if (command==="logpartner") {
      const user = message.mentions.users.first();
      const serverName = args[1];
      const amount = parseInt(args[2]);
      if (!user || !serverName || isNaN(amount)) return message.reply("Gebruik: !logpartner @user <server> <Robux>");
      data[user.id] = (data[user.id]||0)+amount;
      saveData();
      await updateMainEmbed(statsChannel);
      await partnerLogChannel.send(`<@${user.id}> kreeg ${amount} Robux voor server ${serverName} door ${message.author.tag}`);
      return message.reply(`✅ ${user.tag} bijgewerkt!`);
    }

    // !add partner
    if (command==="add" && args[0]==="partner") {
      const user = message.mentions.users.first();
      if (!user) return message.reply("Gebruik: !add partner @user");
      await partnerLogChannel.send(`✅ ${user.tag} toegevoegd door ${message.author.tag}`);
      return message.reply(`✅ Partner ${user.tag} toegevoegd!`);
    }

    // !totaal
    if (command==="totaal") {
      const amount = data[message.author.id] || 0;
      return message.reply(`Je totaal Robux: ${amount}`);
    }

    // !bericht
    if (command==="bericht") {
      return message.channel.send(`**🚒  | Brandweer Gasselternijveen Surveillance© | 🚒**

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

https://discord.gg/zUMXPh3aBH`);
    }
  }

});

// ---------------- LOGIN ----------------
client.login(TOKEN);
