import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  InteractionType
} from "discord.js";
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
const MAIN_CHANNEL = "1424777371092910181";
const PARTNER_CHANNEL = "1355967233976832164";
const DATA_FILE = "./data.json";

const BEHEER_ROLE = "1355971325700739143";
const LEIDING_ROLES = ["1427017418122723379", "1427019646665490472"];
const MARKETING_ROLE = "1424424991797154003";

// ---------------- DATA ----------------
let data = fs.existsSync(DATA_FILE)
  ? fs.readJsonSync(DATA_FILE)
  : {
      partnerCount: 0,
      "1189931854657224858": 400,
      "1375552459723902976": 235,
      "846391521863532604": 270,
      "1041376138829770792": 120,
      "1372670379717562480": 75,
      "1335663878683492512": 20,
      "1369407513048514591": 0,
    };
fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });

let MANAGED_USERS = Object.keys(data).filter((id) => id !== "partnerCount");

// ---------------- HELPERS ----------------
function saveData() {
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}
function hasRole(member, roleIds) {
  return roleIds.some((id) => member.roles.cache.has(id));
}

function generateMainEmbed() {
  const sorted = Object.entries(data)
    .filter(([id]) => id !== "partnerCount")
    .sort((a, b) => b[1] - a[1]);
  const description = sorted
    .map(
      ([id, amt]) =>
        `<@${id}>: <:Robux_2019_Logo_gold:1424127061060091984> ${amt}\n===================`
    )
    .join("\n");
  const total = Object.values(data)
    .filter((v) => typeof v === "number")
    .reduce((a, b) => a + b, 0);

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

  // Leiding / Beheer commands
  if (hasRole(message.member, [BEHEER_ROLE, ...LEIDING_ROLES])) {
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

    if (command === "log") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[1] || args[0]);
      if (!user || isNaN(amount)) return;
      if (!MANAGED_USERS.includes(user.id)) return;
      data[user.id] = (data[user.id] || 0) + amount;
      saveData();
      await updateMainEmbed(mainChannel);
    }

    if (command === "set") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[1] || args[0]);
      if (!user || isNaN(amount)) return;
      if (!MANAGED_USERS.includes(user.id)) return;
      data[user.id] = amount;
      saveData();
      await updateMainEmbed(mainChannel);
    }

    if (command === "reset") {
      MANAGED_USERS.forEach((id) => (data[id] = 0));
      saveData();
      await updateMainEmbed(mainChannel);
    }

    if (command === "top") {
      const top5 = Object.entries(data)
        .filter(([id]) => id !== "partnerCount")
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

    if (command === "recreate") {
      mainMessage = null;
      await updateMainEmbed(mainChannel);
    }
  }

  // Marketing / hoger
  if (
    message.member.roles.cache.has(MARKETING_ROLE) ||
    hasRole(message.member, [BEHEER_ROLE, ...LEIDING_ROLES])
  ) {
    if (command === "totaal") {
      const amount = data[message.author.id] || 0;
      return message.reply(
        `Je totaal Robux: ${amount} <:Robux_2019_Logo_gold:1424127061060091984>`
      );
    }

    if (command === "padd") {
      const modal = new ModalBuilder()
        .setCustomId("partnerModal")
        .setTitle("Nieuw Partnerbericht");

      const textInput = new TextInputBuilder()
        .setCustomId("partnerText")
        .setLabel("Partner bericht")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const tagSelect = new StringSelectMenuBuilder()
        .setCustomId("partnerTag")
        .setPlaceholder("Kies een tag (optioneel)")
        .addOptions([
          { label: "Geen", value: "none" },
          { label: "@everyone", value: "@everyone" },
          { label: "@here", value: "@here" },
        ]);

      const row1 = new ActionRowBuilder().addComponents(textInput);
      const row2 = new ActionRowBuilder().addComponents(tagSelect);
      await message.showModal(modal.addComponents(row1, row2));
    }
  }

  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🚒 Brandweer Gasselternijveen Surveillance Bot Commands")
      .setDescription("Overzicht van alle beschikbare commands")
      .addFields(
        {
          name: "Leiding / Beheer",
          value:
            "`!collega add @user`\n`!collega ontslaan @user`\n`!log @user <Robux>`\n`!set @user <Robux>`\n`!reset`\n`!top`\n`!recreate`",
          inline: false,
        },
        {
          name: "Marketing Team",
          value:
            "`!totaal` - Bekijk eigen totaal\n`!top` - Top 5 overzicht\n`!padd` - Stuur partnerbericht",
          inline: false,
        }
      )
      .setFooter({
        text: "MarketingTeam  Brandweer Gasselternijveen Surveillance.",
      });
    return message.channel.send({ embeds: [embed] });
  }
});

// ---------------- INTERACTION HANDLER ----------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId === "partnerModal") {
    const partnerText = interaction.fields.getTextInputValue("partnerText");
    const tagSelect = interaction.components[1].components[0];
    const tagValue = tagSelect?.value || "none";

    const partnerChannel = await client.channels.fetch(PARTNER_CHANNEL);
    const tag =
      tagValue === "@everyone"
        ? "@everyone"
        : tagValue === "@here"
        ? "@here"
        : "";

    await partnerChannel.send(`${tag}\n${partnerText}`);

    data.partnerCount = (data.partnerCount || 0) + 1;
    saveData();
    await interaction.deferUpdate();
  }
});

// ---------------- LOGIN ----------------
client.login(TOKEN);
