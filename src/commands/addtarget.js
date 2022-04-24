const { SlashCommandBuilder } = require('@discordjs/builders');
const collectionSchema = require('../schemas/guild-schema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addtarget')
        .setDescription('Add a collection to monitor its floor price: add [collection slug] [price in ETH]'),

    async execute(interaction, args, client) {
        await interaction.reply("WIP")
    },
}