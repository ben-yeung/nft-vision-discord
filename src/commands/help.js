const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get the list of current commands.'),
    options: '',
    async execute(interaction, args, client) {
        let helpDesc = '';

        client.commands.forEach((value, key) => {
            if (key != 'help')
                helpDesc += `\n\n **/${key}** ${value.options} \n ${value.data.description}`
        })

        let embed = new Discord.MessageEmbed()
            .setTitle('Help | Active Commands')
            .setDescription(helpDesc)
            .setColor(44774)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });

    },
}