const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const botconfig = require('../botconfig.json');
const { getAsset } = require('../utils/get-asset');
const { indexCollection } = require('../utils/index-collection');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('index')
        .setDescription('Index a collection to see rarity rankings. May take some time.')
        .addStringOption(option => option.setName('collection-slug').setDescription('OpenSea Collection slug. Commmonly found in the URL of the collection.').setRequired(true)),
    options: '[collection-slug]',
    async execute(interaction, args, client) {
        let slug = interaction.options.getString('collection-slug');

        await interaction.reply({ content: 'Queuing collection to be indexed. Please give me a moment.', embeds: [] });

        indexCollection(client, slug).then(test => {
            return interaction.editReply({ content: `<@${interaction.user.id}>, Finished indexing **${slug}**.` })
        }).catch(err => {
            return interaction.editReply(err);
        });

    },
}