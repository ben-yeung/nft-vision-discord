const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getlist')
        .setDescription('Get a list of the collections currently being monitored.'),
    options: '',

    async execute(interaction, args, client) {

        let res = await guildSchema.findOne({ guild_id: interaction.guild.id });
        if (!res) {
            await new guildSchema({ guild_id: interaction.guild.id, guild_name: interaction.guild.name, alerts_channel: '' }).save();
            res = await guildSchema.findOne({ guild_id: interaction.guild.id });
        }

        const collections = res.collections;
        let compiledStr = '';

        for (var i = 0; i < collections.length; i++) {
            let url = 'https://opensea.io/collection/' + collections[i].slug;
            let check = (collections[i].check_above ? 'Above' : 'Below');
            compiledStr += `\n\n **${collections[i].slug}** • Target Price: ${check} ${collections[i].target}Ξ • [OpenSea](${url})`;
        }

        compiledStr = (compiledStr == '' ? 'No collections currently monitored. Use /add to get started.' : compiledStr);

        let embed = new Discord.MessageEmbed()
            .setTitle('Collection Monitor List')
            .setDescription(compiledStr)
            .setFooter({ text: 'Use /add with the same slug to update target prices.' })
            .setColor(44774)

        return interaction.reply({ embeds: [embed] });
    },
}