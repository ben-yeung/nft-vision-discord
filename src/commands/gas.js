const Discord = require("discord.js")
const axios = require('axios');
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const botconfig = require('../botconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gas')
        .setDescription('View current safe, market, and fast gas conditions.'),
    options: '',
    async execute(interaction, args, client) {

        try {
            response = await axios.get(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${botconfig.ETHERSCAN_API}`);
        } catch (err) {
            response = null;
            console.log(err);
        }
        if (response) {
            const json = response.data;
            let embed = new Discord.MessageEmbed()
                .setTitle(`⛽ Gas Prices`)
                .setDescription(`[Gas Tracker](https://etherscan.io/gastracker)`)
                .addField('Fast ⚡', `${json.result.FastGasPrice} gwei`, true)
                .addField('Market 🚶', `${json.result.ProposeGasPrice} gwei`, true)
                .addField('Slow 🐢', `${json.result.SafeGasPrice} gwei`, true)
                .setColor(44774)
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply({ content: "Error fetching gas prices. Try again in a moment.", ephemeral: true })
        }


    },
}