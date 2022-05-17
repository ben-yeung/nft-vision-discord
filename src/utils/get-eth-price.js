const Discord = require("discord.js");
const axios = require('axios');
const botconfig = require('../botconfig.json');
const guildSchema = require('../schemas/guild-schema');

/**
 * Function for retrieving ETH's current price in USD. Used to translate ETH prices in embeds.
 * This function utilizes CoinGecko's API for getting ETH's USD conversion. The free plan is limited by 50 calls per minute
 * See more here: https://www.coingecko.com/en/api/documentation
 */

exports.getEthPrice = async (client) => {
    try {
        response = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum');
    } catch (err) {
        response = null;
        console.log(err);
    }
    if (response) {
        const json = response.data;
        client.eth = json[0].current_price;
    }
}