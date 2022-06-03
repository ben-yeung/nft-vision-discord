const Discord = require("discord.js");
const axios = require("axios");
const { SlashCommandBuilder } = require("@discordjs/builders");
const guildSchema = require("../schemas/guild-schema");
const botconfig = require("../botconfig.json");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 10,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription(
      "Convert a given crypto to current USD conversion. Support for USD conversion only at the moment."
    )
    .addStringOption((option) =>
      option
        .setName("symbol")
        .setDescription("Name/id/symbol of coin to convert. Uses CoinGecko API")
        .setRequired(true)
    ),
  options: "[symbol]",
  async execute(interaction, args, client) {
    try {
      const coinList = await axios.get(
        "https://api.coingecko.com/api/v3/coins/list"
      );

      let input = interaction.options.getString("symbol");
      input = input.toLowerCase();
      const coin = coinList.data.find(
        (elem) =>
          elem.id.toLowerCase() == input ||
          elem.symbol.toLowerCase() == input ||
          elem.name.toLowerCase() == input
      );

      if (!coin)
        return interaction.reply(
          "I could not find a coin with that name/symbol/id"
        );

      let coinStats = await axios.get(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
          coin.id
      );
      let data = coinStats.data[0];
      let thumb = data.image;
      let symbol = data.symbol.toUpperCase();
      let name = data.name;
      let currPrice = data.current_price;
      let priceChange = data.price_change_percentage_24h;
      let change = priceChange >= 0 ? "📈" : "📉";

      let embed = new Discord.MessageEmbed()
        .setTitle(`${name} (${symbol})`)
        .setURL(`https://coinmarketcap.com/currencies/${coin.id}`)
        .addField("Current Price", `${currency.format(currPrice)} USD`)
        .addField(
          "24H Change",
          `${parseFloat(priceChange).toFixed(2)}% ${change}`
        )
        .setThumbnail(thumb)
        .setColor(44774)
        .setFooter({ text: `CoinGecko id: ${coin.id}` });

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.log(err);
      interaction.reply("An error occurred. Please try again in a moment.");
    }
  },
};
