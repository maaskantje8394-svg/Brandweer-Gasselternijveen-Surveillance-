import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import fs from "fs-extra";
import express from "express";

// ---------------- EXPRESS SERVER ----------------
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req,res)=>res.send("Bot is online ✅"));
app.listen(PORT,()=>console.log(`Express server draait op poort ${PORT}`));

// ---------------- DISCORD ----------------
const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ---------------- CONFIG ----------------
const TOKEN = process.env.TOKEN;
const MAIN_CHANNEL = "1424777371092910181"; // Eind bedrag kanaal
const DATA_FILE = "./data.json";

// Rollen
const BEHEER_ROLE = "1355971325700739143";
const LEIDING_ROLES = ["1427017418122723379","1427019646665490472"];
const MARKETING_ROLE = "1424424991797154003";

// ---------------- DATA ----------------
let data = {
  "1189931854657224858": 400,
  "1375552459723902976": 235,
  "846391521863532604": 270,
  "1041376138829770792": 120,
  "1372670379717562480": 75,
  "1335663878683492512": 20,
  "1369407513048514591": 0
};
let MANAGED_USERS = Object.keys(data);
fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });

// ---------------- HELPERS ----------------
function saveData(){ fs.writeJsonSync(DATA_FILE,data,{spaces:2}); }
function hasRole(member,roleIds){ return roleIds.some(id=>member.roles.cache.has(id)); }

function generateMainEmbed(){
  const sorted = Object.entries(data).sort((a,b)=>b[1]-a[1]);
  const description = sorted.map(([id,amt])=>`<@${id}>: <:Robux_2019_Logo_gold:1424127061060091984> ${amt}\n===================`).join("\n");
  const total = Object.values(data).reduce((a,b)=>a+b,0);

  return new EmbedBuilder()
    .setColor(0xDC3004)
    .setTitle("📊 Marketing Leden")
    .setDescription(`${description}\n**In totaal: <:Robux_2019_Logo_gold:1424127061060091984> ${total}**\n\nMarketing uitbetalingen \`Oktober\`\nUitbetaling op \`01-11-2025\``)
    .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg")
    .setFooter({ text:"MarketingTeam  Brandweer Gasselternijveen Surveillance." });
}

let mainMessage;
async function updateMainEmbed(channel){
  const embed = generateMainEmbed();
  if(!mainMessage) mainMessage = await channel.send({embeds:[embed]});
  else await mainMessage.edit({embeds:[embed]});
}

// ---------------- READY ----------------
client.once("ready",async ()=>{
  console.log(`Ingelogd als ${client.user.tag}`);
  const mainChannel = await client.channels.fetch(MAIN_CHANNEL);
  await updateMainEmbed(mainChannel);
});

// ---------------- COMMANDS ----------------
client.on("messageCreate",async message=>{
  if(message.author.bot || !message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const mainChannel = await client.channels.fetch(MAIN_CHANNEL);

  // ---------- LEIDING / BEHEER COMMANDS ----------
  if(hasRole(message.member,[BEHEER_ROLE,...LEIDING_ROLES])){

    // !collega add/ontslaan
    if(command==="collega"){
      const sub = args[0];
      const userId = args[1]?.replace(/[<@!>]/g,"");
      if(!userId) return;

      if(sub==="add" && !MANAGED_USERS.includes(userId)){
        MANAGED_USERS.push(userId);
        data[userId] = 0;
        saveData();
        await updateMainEmbed(mainChannel);
      }

      if(sub==="ontslaan" && MANAGED_USERS.includes(userId)){
        MANAGED_USERS = MANAGED_USERS.filter(id=>id!==userId);
        delete data[userId];
        saveData();
        await updateMainEmbed(mainChannel);
      }
    }

    // !log @user <amount>
    if(command==="log"){
      const user = message.mentions.users.first();
      const amount = parseInt(args[1]||args[0]);
      if(!user || isNaN(amount)) return;
      if(!MANAGED_USERS.includes(user.id)) return;
      data[user.id] = (data[user.id]||0)+amount;
      saveData();
      await updateMainEmbed(mainChannel);
    }

    // !set @user <amount>
    if(command==="set"){
      const user = message.mentions.users.first();
      const amount = parseInt(args[1]||args[0]);
      if(!user || isNaN(amount)) return;
      if(!MANAGED_USERS.includes(user.id)) return;
      data[user.id] = amount;
      saveData();
      await updateMainEmbed(mainChannel);
    }

    // !reset
    if(command==="reset"){
      MANAGED_USERS.forEach(id=>data[id]=0);
      saveData();
      await updateMainEmbed(mainChannel);
    }

    // !top
    if(command==="top"){
      const top5 = Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,5)
        .map(([id,amt],i)=>`**${i+1}.** <@${id}> - ${amt} <:Robux_2019_Logo_gold:1424127061060091984>`).join("\n");
      const embed = new EmbedBuilder()
        .setTitle("🏆 Top 5 Marketing Leden")
        .setColor(0x00FFFF)
        .setDescription(top5);
      return message.channel.send({embeds:[embed]});
    }

    // !recreate
    if(command==="recreate"){
      mainMessage=null;
      await updateMainEmbed(mainChannel);
    }
  }

  // ---------- MARKETING TEAM COMMANDS ----------
  if(message.member.roles.cache.has(MARKETING_ROLE)){
    // !totaal
    if(command==="totaal"){
      const amount = data[message.author.id]||0;
      return message.reply(`Je totaal Robux: ${amount} <:Robux_2019_Logo_gold:1424127061060091984>`);
    }

    // !top
    if(command==="top"){
      const top5 = Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,5)
        .map(([id,amt],i)=>`**${i+1}.** <@${id}> - ${amt} <:Robux_2019_Logo_gold:1424127061060091984>`).join("\n");
      const embed = new EmbedBuilder()
        .setTitle("🏆 Top 5 Marketing Leden")
        .setColor(0x00FFFF)
        .setDescription(top5);
      return message.channel.send({embeds:[embed]});
    }

    // ---------- !padd command ----------
    if(command==="padd"){
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("tag_none")
            .setLabel("Geen")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("tag_everyone")
            .setLabel("@everyone")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("tag_here")
            .setLabel("@here")
            .setStyle(ButtonStyle.Secondary)
        );

      await message.reply({ content: "Kies een tag voor het partner bericht:", components: [row], ephemeral: true });
    }
  }

  // ---------- HELP ----------
  if(command==="help"){
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle("🚒 Brandweer Gasselternijveen Surveillance Bot Commands")
      .setDescription("Overzicht van alle beschikbare commands")
      .setImage("https://media.discordapp.net/attachments/1274312169743319112/1427225588132872246/658F897E-B2C5-49F5-A349-BA838DF7B241.jpg")
      .addFields(
        { name:"Leiding / Beheer", value:"`!collega add @user` - Voeg toe\n`!collega ontslaan @user` - Verwijder\n`!log @user <Robux>` - Voeg Robux toe\n`!set @user <Robux>` - Zet totaal\n`!reset` - Reset alles\n`!top` - Top 5\n`!recreate` - Herbouw embed", inline:false },
        { name:"Marketing Team", value:"`!totaal` - Bekijk eigen totaal\n`!top` - Top 5 overzicht\n`!padd` - Partner bericht maken", inline:false }
      )
      .setFooter({text:"MarketingTeam  Brandweer Gasselternijveen Surveillance."});
    return message.channel.send({embeds:[embed]});
  }
});

// ---------------- BUTTON + MODAL HANDLING ----------------
client.on("interactionCreate", async interaction => {
  // Button click
  if(interaction.isButton()){
    let tag = "";
    if(interaction.customId === "tag_none") tag = "";
    if(interaction.customId === "tag_everyone") tag = "@everyone";
    if(interaction.customId === "tag_here") tag = "@here";

    const modal = new ModalBuilder()
      .setCustomId(`partnerModal-${interaction.user.id}-${tag}`)
      .setTitle("Partner bericht");

    const messageInput = new TextInputBuilder()
      .setCustomId("partnerMessage")
      .setLabel("Typ je partner bericht")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(messageInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  // Modal submit
  if(interaction.isModalSubmit()){
    if(!interaction.customId.startsWith("partnerModal-")) return;

    const parts = interaction.customId.split("-");
    const tag = parts[2]; // tag uit button
    const text = interaction.fields.getTextInputValue("partnerMessage");

    await interaction.reply({ content: `${tag} ${text}`, ephemeral: false });
  }
});

// ---------------- LOGIN ----------------
client.login(TOKEN);
