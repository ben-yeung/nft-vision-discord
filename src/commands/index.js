const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const guildSchema = require("../schemas/guild-schema");
const botconfig = require("../botconfig.json");
const { indexCollection } = require("../utils/index-collection");
const { indexAdvanced } = require("../utils/index-advanced");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("index")
    .setDescription("Index a collection to see rarity rankings. May take some time.")
    .addStringOption((option) =>
      option.setName("collection-slug").setDescription("OpenSea Collection slug. Commmonly found in the URL of the collection.").setRequired(true)
    )
    .addBooleanOption((option) =>
      option.setName("override").setDescription("Defaulted to False. Use other, slower indexing method as backup in case token ids are mixed.")
    ),
  options: "[collection-slug]",
  async execute(interaction, args, client) {
    let slug = interaction.options.getString("collection-slug");
    let override = interaction.options.getBoolean("override");

    await interaction.reply({
      content: "Queuing collection to be indexed. Please give me a moment.",
      embeds: [],
    });

    if (!override) {
      indexAdvanced(client, slug)
        .then(() => {
          return interaction.editReply({
            content: `<@${interaction.user.id}>, Finished indexing **${slug}**.`,
          });
        })
        .catch((err) => {
          return interaction.editReply({ content: err, ephemeral: true });
        });
    } else {
      console.log("Override detected.");
      indexCollection(client, slug)
        .then(() => {
          return interaction.editReply({
            content: `<@${interaction.user.id}>, Finished indexing **${slug}**.`,
          });
        })
        .catch((err) => {
          return interaction.editReply({ content: err, ephemeral: true });
        });
    }
  },
};
