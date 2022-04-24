const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require("discord.js")
const { collection } = require('../schemas/guild-schema');
const guildSchema = require('../schemas/guild-schema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getlist')
        .setDescription('Get a list of the collections currently being monitored.'),

    async execute(interaction, args, client) {

        const res = await guildSchema.findOne({ guild_id: interaction.guild.id });
        if (!res) await new guildSchema({ guild_id: interaction.guild.id, guild_name: interaction.guild.name, alerts_channel: '' }).save();

        const collections = res.collections;
        let compiledStr = '';

        for (var i = 0; i < collections.length; i++) {
            let url = 'https://opensea.io/collection/' + collections[i].slug;
            if (collections[i].check_above) {
                compiledStr += `\n\n **${collections[i].slug}** | Target Price: Above ${collections[i].target}Ξ | [OpenSea](${url})`
            } else {
                compiledStr += `\n\n **${collections[i].slug}** | Target Price: Below ${collections[i].target}Ξ | [OpenSea](${url})`
            }
        }

        compiledStr = (compiledStr == '' ? 'No collections currently monitored. Use /addtarget to get started.' : compiledStr);

        let embed = new Discord.MessageEmbed()
            .setTitle('Collection Monitor List')
            .setDescription(compiledStr)
            .setColor(44774)
            .setTimestamp()

        return interaction.reply({ embeds: [embed] })
    },
}