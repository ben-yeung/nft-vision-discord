const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setalerts')
        .setDescription('Set the current Guild\'s dedicated Alerts Channel. Must have admin perms: /setalerts [channel id]')
        .addStringOption(option => option.setName('channel-id').setDescription('Enter a channel id to receive floor price alerts.').setRequired(true)),
    permission: 'ADMINISTRATOR',

    async execute(interaction, args, client) {

        const newChannelID = interaction.options.getString('channel-id');
        const getChannel = interaction.guild.channels.cache.get(newChannelID);
        if (!getChannel) return interaction.reply('Could not find a channel from the given id.');

        try {
            const res = await guildSchema.findOneAndUpdate({ guild_id: interaction.guild.id }, { alerts_channel: newChannelID })
            if (res == null) return interaction.reply('An error occurred. Please try again.');
        } catch (err) {
            return interaction.reply('An error occurred. Please try again.');
        }

        return interaction.reply('Successfully updated alerts channel id.');

    },
}