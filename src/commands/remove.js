const { SlashCommandBuilder } = require("@discordjs/builders");
const guildSchema = require("../schemas/guild-schema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a collection from the monitor list.")
    .addStringOption((option) =>
      option
        .setName("collection-slug")
        .setDescription(
          "OpenSea Collection slug. Commmonly found in the URL of the collection."
        )
        .setRequired(true)
    ),
  options: "[collection-slug]",
  async execute(interaction, args, client) {
    var collectionSlug = interaction.options.getString("collection-slug");
    // Check if alias exists
    try {
      let res = await guildSchema.findOne({ guild_id: interaction.guild.id });
      if (!res) {
        await new guildSchema({
          guild_id: interaction.guild.id,
          guild_name: interaction.guild.name,
          alerts_channel: "",
        }).save();
      }
      res = await guildSchema.findOne({ guild_id: interaction.guild.id });
      if (res.aliases && res.aliases[collectionSlug]) {
        collectionSlug = res.aliases[collectionSlug];
        aliasFound = true;
      }
    } catch (err) {
      console.log("Err fetching aliases for guild.");
    }

    let res = await guildSchema.findOne({ guild_id: interaction.guild.id });
    if (!res) {
      await new guildSchema({
        guild_id: interaction.guild.id,
        guild_name: interaction.guild.name,
        alerts_channel: "",
      }).save();
      res = await guildSchema.findOne({ guild_id: interaction.guild.id });
    }

    var collections = res.collections;
    const lenBefore = collections.length;

    collections = collections.filter(function (item) {
      return item.slug != collectionSlug;
    });
    if (lenBefore == collections.length)
      return interaction.reply({
        content:
          "Could not find collection in monitor list. Check for typos or use /getlist",
        ephemeral: true,
      });

    try {
      const res = await guildSchema.findOneAndUpdate(
        { guild_id: interaction.guild.id },
        { collections: collections }
      );
      if (res == null)
        return interaction.reply({
          content: "An error occurred. Please try again.",
          ephemeral: true,
        });
    } catch (err) {
      return interaction.reply({
        content: "An error occurred. Please try again.",
        ephemeral: true,
      });
    }

    return interaction.reply(
      `Successfully removed **${collectionSlug}** from monitor list.`
    );
  },
};
