const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const botconfig = require('../botconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('')
        .setDescription('')
        .addStringOption(option => option.setName('').setDescription('').setRequired(true)),
    options: '',
    async execute(interaction, args, client) {


        let embed = new Discord.MessageEmbed()
            .addField('Slow 🐢', `${json.result.SafeGasPrice} gwei`, true)
            .addField('Market 🚶', `${json.result.ProposeGasPrice} gwei`, true)
            .addField('Fast ⚡', `${json.result.FastGasPrice} gwei`, true)

        return interaction.reply(':)');

    },
}