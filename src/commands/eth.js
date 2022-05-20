const Discord = require("discord.js")
const axios = require('axios');
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const botconfig = require('../botconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eth')
        .setDescription('Convert eth to current USD conversion. Support for USD conversion only at the moment.')
        .addStringOption(option => option.setName('amount').setDescription('Amount of ETH to convert to USD.')),
    options: '[amount]',
    async execute(interaction, args, client) {

        if (client.eth === undefined) return interaction.reply('CoinGecko API seems to be down. Please try again later.')

        let input = (interaction.options.getString('amount') ? Number(interaction.options.getString('amount')) : 1);
        let converted = Number((input * client.eth).toFixed(2)).toLocaleString('en-us');

        let embed = new Discord.MessageEmbed()
            .setTitle(`ETH to USD ($${client.eth})`)
            .setDescription(`[CoinMarketCap](https://coinmarketcap.com/currencies/ethereum/)`)
            .addField('ETH', `${input}Ξ`, true)
            .addField('USD', `$${converted}`, true)
            .addField("\u200B", '\u200B', true)
            .setColor(44774)

        try {
            response = await axios.get(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${botconfig.ETHERSCAN_API}`);
        } catch (err) {
            response = null;
            console.log(err);
        }
        if (response) {
            const json = response.data;
            embed.setFooter({
                text: `⚡${json.result.FastGasPrice} • 🚶${json.result.ProposeGasPrice} • 🐢${json.result.SafeGasPrice}`
            })
        }

        return interaction.reply({ embeds: [embed] });

    },
}