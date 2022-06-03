const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const guildSchema = require("../schemas/guild-schema");
const sdk = require("api")("@opensea/v1.0#bg4ikl1mk428b");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("derisk")
    .setDescription(
      "Calculate the minimum amount of ETH to list an NFT in order to receive exactly what you paid for it."
    )
    .addStringOption((option) =>
      option
        .setName("collection-slug")
        .setDescription(
          "OpenSea Collection slug. Commmonly found in the URL of the collection."
        )
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("Price bought for. Include gas fees for best estimate.")
        .setRequired(true)
    ),
  options: "[collection-slug] [amount]",
  async execute(interaction, args, client) {
    let amount = interaction.options.getNumber("amount");
    let collectionSlug = interaction.options.getString("collection-slug");
    if (amount < 0)
      return interaction.reply({
        content: "Not a valid amount. Can't be negative!",
        ephemeral: true,
      });

    var aliasFound = false;

    // Check if alias exists
    try {
      let res = await guildSchema.findOne({ guild_id: interaction.guild.id });
      if (!res) {
        await new guildSchema({
          guild_id: interaction.guild.id,
          guild_name: interaction.guild.name,
          alerts_channel: "",
        }).save();
      }
      res = await guildSchema.findOne({ guild_id: interaction.guild.id });
      if (res.aliases && res.aliases[collectionSlug]) {
        collectionSlug = res.aliases[collectionSlug];
        aliasFound = true;
      }
    } catch (err) {
      console.log("Err fetching aliases for guild.");
    }

    sdk["retrieving-a-single-collection"]({
      collection_slug: collectionSlug,
      "X-API-KEY": client.OS_KEY,
    })
      .then((res) => {
        let stats = res.collection.stats;
        let totalSupply = stats.total_supply;
        let numOwners = stats.num_owners;
        let currFloor = Number(stats.floor_price.toFixed(4));
        let royalty =
          (Number(res.collection.dev_seller_fee_basis_points) +
            Number(res.collection.opensea_seller_fee_basis_points)) /
          100;
        let deriskListing = Number((amount / (1 - royalty / 100)).toFixed(4));
        let afterFees = Number((currFloor * (1 - royalty / 100)).toFixed(4));
        let profits = Number(afterFees - amount).toFixed(4);
        let name = res.collection.name;
        let imageThumb = res.collection.image_url;
        let discordURL = res.collection.discord_url;
        let website = res.collection.external_url;
        let twitterUser = res.collection.twitter_username;
        let openSea = "https://opensea.io/collection/" + res.collection.slug;

        let desc = `**If you bought for a total of** ${amount}Ξ (~$${client
          .convertETH(amount)
          .toLocaleString(
            "en-US"
          )}) \n **To sell for break even list at** ${deriskListing}Ξ (~$${client
          .convertETH(deriskListing)
          .toLocaleString("en-US")}) \n
                            **If you sold at current floor** ${currFloor}Ξ (~$${client
          .convertETH(currFloor)
          .toLocaleString(
            "en-US"
          )}) \n **You would receive** ${afterFees.toLocaleString(
          "en-US"
        )}Ξ (~$${client
          .convertETH(afterFees)
          .toLocaleString(
            "en-US"
          )}) \n **Current floor nets** ${profits}Ξ (~$${client
          .convertETH(profits)
          .toLocaleString("en-US")}) in profit. \n
                            Use /royalty [slug] [amount] \n to view custom sell targets after fees. \n\n [OpenSea](${openSea})`;
        if (discordURL) desc += ` • [Discord](${discordURL})`;
        if (website) desc += ` • [Website](${website})`;
        if (twitterUser)
          desc += ` • [Twitter](https://twitter.com/${twitterUser})`;

        let findEmbed = new Discord.MessageEmbed()
          .setTitle(`${name}`)
          .setDescription(desc)
          .setThumbnail(imageThumb)
          .setColor(44774)
          .setFooter({
            text: `Royalties: ${royalty}% | Total Supply: ${totalSupply} | Owners: ${numOwners}`,
          });

        return interaction.reply({ embeds: [findEmbed] });
      })
      .catch((err) => {
        console.log(err);
        return interaction.reply({
          content:
            "Error while searching for collection. Check for typos or try again.",
          ephemeral: true,
        });
      });
  },
};
