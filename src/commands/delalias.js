const { SlashCommandBuilder } = require("@discordjs/builders");
const { collection } = require("../schemas/guild-schema");
const guildSchema = require("../schemas/guild-schema");
const sdk = require("api")("@opensea/v1.0#bg4ikl1mk428b");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delalias")
    .setDescription("Delete an alias from guild's alias list.")
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
    const alias = interaction.options.getString("alias");

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
    if (!aliases[alias]) {
      return interaction.reply(
        `No alias with name ${alias} found in list of aliases. Try using /listalias to see all aliases`
      );
    }
    delete aliases[alias];

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
      `Successfully removed alias **${alias}** from alias list.`
    );
  },
};
