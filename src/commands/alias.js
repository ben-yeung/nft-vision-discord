const { SlashCommandBuilder } = require("@discordjs/builders");
const { collection } = require("../schemas/guild-schema");
const guildSchema = require("../schemas/guild-schema");
const sdk = require("api")("@opensea/v1.0#bg4ikl1mk428b");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("alias")
    .setDescription(
      "Add an alias to make it easier to call other commands. Useful for complicated slugs"
    )
    .addStringOption((option) =>
      option
        .setName("collection-slug")
        .setDescription(
          "OpenSea Collection slug. Commmonly found in the URL of the collection."
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("alias")
        .setDescription(
          "Custom alias to use in place of slug. Per guild basis."
        )
        .setRequired(true)
    ),
  options: "[collection-slug] [alias]",
  async execute(interaction, args, client) {
    const collectionSlug = interaction.options.getString("collection-slug");
    const alias = interaction.options.getString("alias");

    try {
      await sdk["retrieving-a-single-collection"]({
        collection_slug: collectionSlug,
        "X-API-KEY": client.OS_KEY,
      })
        .then(async () => {
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
            console.log("No aliases found. Adding section");
            res.aliases = {};
          }
          let aliases = res.aliases;
          aliases[alias] = collectionSlug;

          try {
            const res = await guildSchema.findOneAndUpdate(
              { guild_id: interaction.guild.id },
              { aliases: aliases }
            );
            if (res == null)
              return interaction.reply("An error occurred. Please try again.");
          } catch (err) {
            return interaction.reply({
              content:
                "An error occurred while updating. Please try again in a moment.",
              ephemeral: true,
            });
          }
          return interaction.reply(
            `Successfully added alias **${alias}** for collection slug **${collectionSlug}**`
          );
        })
        .catch((err) => {
          console.log(err);
          return interaction.reply({
            content:
              "Error: Collection does not exist with given slug or OpenSea is rate limited. Please try again in a moment.",
            ephemeral: true,
          });
        });
    } catch (err) {
      console.log(err);
      return interaction.reply({
        content: "Error receiving command. Please try again in a moment.",
        ephemeral: true,
      });
    }
  },
};
