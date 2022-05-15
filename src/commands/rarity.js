const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const botconfig = require('../botconfig.json');
const { getAsset } = require('../helpers/get-asset');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rarity')
        .setDescription('Get the rarity of a specific token from a collection')
        .addStringOption(option => option.setName('collection-slug').setDescription('OpenSea Collection slug. Commmonly found in the URL of the collection.').setRequired(true))
        .addStringOption(option => option.setName('token-id').setDescription('NFT specific token id. Usually in name. Otherwise check txn for ID.').setRequired(true)),
    options: '[collection-slug] [token-id]',
    async execute(interaction, args, client) {
        let slug = interaction.options.getString('collection-slug');
        let token_id = interaction.options.getString('token-id');

        let res = await getAsset(client, slug, token_id);
        // console.log(res);

        return interaction.reply(':)');

    },
}