const { SlashCommandBuilder } = require("@discordjs/builders");
const { collection } = require("../schemas/guild-schema");
const guildSchema = require("../schemas/guild-schema");
const sdk = require("api")("@opensea/v1.0#bg4ikl1mk428b");
const Discord = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("listalias")
    .setDescription("Fetch a list of all aliases in this guild."),
  options: "",
  async execute(interaction, args, client) {
    let res = await guildSchema.findOne({
      guild_id: interaction.guild.id,
    });
    if (!res) {
      await new guildSchema({
        guild_id: interaction.guild.id,
        guild_name: interaction.guild.name,
        alerts_channel: "",
      }).save();
      res = await guildSchema.findOne({ guild_id: interaction.guild.id });
    }

    if (!res.aliases) {
      return interaction.reply(
        "No aliases found. Get started with /alias [slug] [alias]"
      );
    }
    let aliases = res.aliases;
    let keys = Object.keys(aliases);
    let desc = "Format is alias : collection-slug \n\n";

    for (var i = 0; i < keys.length; i++) {
      desc += `**${keys[i]}** : ${aliases[keys[i]]} \n\n`;
    }

    let embed = new Discord.MessageEmbed()
      .setTitle("Alias List")
      .setDescription(desc)
      .setColor(44774)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
