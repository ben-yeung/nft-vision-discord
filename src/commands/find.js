const Discord = require("discord.js");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const guildSchema = require("../schemas/guild-schema");
const sdk = require("api")("@opensea/v1.0#bg4ikl1mk428b");
const db = require("quick.db");
const ms = require("ms");

/*
    quick.db is used for command spam prevention
    quick.db is not a long term db solution in this context
    mongoDB is used for per guild collection storing long term
    while quick.db is for Discord command related tracking
*/
function pruneQueries(author) {
  let queries = db.get(`${author.id}.findquery`);
  if (!queries) return;

  for (const [key, val] of Object.entries(queries)) {
    if (Date.now() - val[2] >= 120000) {
      delete queries[key];
    }
  }
  db.set(`${author.id}.findquery`, queries);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("find")
    .setDescription("Retrieve information for a given collection. View stats, royalties, fp, etc")
    .addStringOption((option) =>
      option.setName("collection-slug").setDescription("OpenSea Collection slug. Commmonly found in the URL of the collection.").setRequired(true)
    ),
  options: "[collection-slug]",
  async execute(interaction, args, client) {
    if (db.get(`${interaction.user.id}.findstarted`) && Date.now() - db.get(`${interaction.user.id}.findstarted`) <= 6000) {
      return interaction.reply({
        content: `Please close your most recent find command or wait ${ms(
          6000 - (Date.now() - db.get(`${interaction.user.id}.findstarted`))
        )} before starting another query!`,
        ephemeral: true,
      });
    } else {
      db.set(`${interaction.user.id}.findstarted`, Date.now());
      pruneQueries(interaction.user);
    }
    await interaction.reply({ content: "Searching for collection...", embeds: [] });

    sdk["retrieving-a-single-collection"]({ collection_slug: interaction.options.getString("collection-slug") })
      .then(async (res) => {
        let stats = res.collection.stats;
        let currFloor = stats.floor_price ? Number(stats.floor_price.toFixed(4)) : 0;
        let totalSupply = stats.total_supply;
        let numOwners = stats.num_owners;
        let totalVol = stats.total_volume ? Number(stats.total_volume.toFixed(0)) : 0;
        let totalSales = stats.total_sales ? Number(stats.total_sales).toLocaleString("en-US") : 0;
        let oneDayVol = stats.one_day_volume ? Number(stats.one_day_volume.toFixed(0)) : 0;
        let oneDayAvg = stats.one_day_average_price ? Number(stats.one_day_average_price.toFixed(4)) : 0;
        let oneDaySales = stats.one_day_sales ? Number(stats.one_day_sales.toLocaleString("en-US")) : 0;
        let sevenDayVol = stats.seven_day_volume ? Number(stats.seven_day_volume.toFixed(0)) : 0;
        let sevenDayAvg = stats.seven_day_average_price ? Number(stats.seven_day_average_price.toFixed(4)) : 0;
        let sevenDaySales = stats.seven_day_sales ? Number(stats.seven_day_sales).toLocaleString("en-US") : 0;
        let thirtyDayVol = stats.thirty_day_volume ? Number(stats.thirty_day_volume.toFixed(0)) : 0;
        let thirtyDayAvg = stats.thirty_day_average_price ? Number(stats.thirty_day_average_price.toFixed(4)) : 0;
        let thirtyDaySales = stats.thirty_day_sales ? Number(stats.thirty_day_sales).toLocaleString("en-US") : 0;
        let royalty = (Number(res.collection.dev_seller_fee_basis_points) + Number(res.collection.opensea_seller_fee_basis_points)) / 100;

        let name = res.collection.name;
        let imageThumb = res.collection.image_url;
        let contract = "https://etherscan.io/address/" + res.collection.primary_asset_contracts[0].address;
        let discordURL = res.collection.discord_url;
        let website = res.collection.external_url;
        let twitterUser = res.collection.twitter_username;
        let openSea = "https://opensea.io/collection/" + res.collection.slug;
        let socials = "";

        socials += `[OpenSea](${openSea}) • [Etherscan](${contract})`;

        let detailedDesc = `**Floor Price:** ${currFloor}Ξ (~$${client
          .convertETH(currFloor)
          .toLocaleString("en-US")}) \n**Total Volume:** ${totalVol.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(totalVol)
          .toLocaleString("en-US")}) \n**Total Sales:** ${totalSales} \n\n**24H Volume:** ${oneDayVol.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(oneDayVol)
          .toLocaleString("en-US")}) \n**24H Floor Avg:** ${oneDayAvg.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(oneDayAvg)
          .toLocaleString("en-US")}) \n**24H Sales:** ${oneDaySales} \n\n**7 Day Volume:** ${sevenDayVol.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(sevenDayVol)
          .toLocaleString("en-US")}) \n**7 Day Floor Avg:** ${sevenDayAvg.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(sevenDayAvg)
          .toLocaleString("en-US")}) \n**7 Day Sales:** ${sevenDaySales} \n\n **30 Day Volume:** ${thirtyDayVol.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(thirtyDayVol)
          .toLocaleString("en-US")}) \n**30 Day Floor Avg:** ${thirtyDayAvg.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(thirtyDayAvg)
          .toLocaleString("en-US")}) \n**30 Day Sales:** ${thirtyDaySales} \n\n`;

        let desc = `**Floor Price:** ${currFloor}Ξ (~$${client
          .convertETH(currFloor)
          .toLocaleString("en-US")}) \n **Total Volume:** ${totalVol.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(totalVol)
          .toLocaleString("en-US")}) \n**Total Sales:** ${totalSales} \n\n **24H Volume:** ${oneDayVol.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(oneDayVol)
          .toLocaleString("en-US")}) \n**24H Floor Avg:** ${oneDayAvg.toLocaleString("en-US")}Ξ (~$${client
          .convertETH(oneDayAvg)
          .toLocaleString("en-US")}) \n**24H Sales:** ${oneDaySales} \n\n`;

        if (discordURL) socials += ` • [Discord](${discordURL})`;
        if (website) socials += ` • [Website](${website})`;
        if (twitterUser) socials += ` • [Twitter](https://twitter.com/${twitterUser})`;

        desc += socials;
        detailedDesc += socials;

        let findEmbedSimple = new MessageEmbed()
          .setTitle(`${name}`)
          .setDescription(desc)
          .setThumbnail(imageThumb)
          .setColor(44774)
          .setFooter({
            text: `Royalties: ${royalty}% | Total Supply: ${totalSupply} | Owners: ${numOwners}`,
          });

        let findEmbedDetailed = new MessageEmbed()
          .setTitle(`${name}`)
          .setDescription(detailedDesc)
          .setThumbnail(imageThumb)
          .setColor(44774)
          .setFooter({
            text: `Royalties: ${royalty}% | Total Supply: ${totalSupply} | Owners: ${numOwners}`,
          });

        const row = new MessageActionRow()
          .addComponents(new MessageButton().setCustomId("find_details").setLabel("More Details").setStyle("PRIMARY"))
          .addComponents(new MessageButton().setCustomId("find_close").setLabel("Close").setStyle("DANGER"));

        await interaction.editReply({ content: " ­", embeds: [findEmbedSimple], components: [row] });

        let currQueries = db.get(`${interaction.user.id}.findquery`) != null ? db.get(`${interaction.user.id}.findquery`) : {};
        currQueries[interaction.id] = [findEmbedSimple, findEmbedDetailed, Date.now()];
        db.set(`${interaction.user.id}.findquery`, currQueries);

        const message = await interaction.fetchReply();

        const filter = (btn) => {
          return btn.user.id === interaction.user.id && btn.message.id == message.id;
        };

        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          time: 1000 * 60,
        });

        collector.on("collect", async (button) => {
          let queries = db.get(`${interaction.user.id}.findquery`);
          if (!queries || !queries[interaction.id]) {
            return button.deferUpdate();
          }
          let simple = queries[interaction.id][0];
          let detailed = queries[interaction.id][1];

          if (button.customId == "find_details") {
            const row = new MessageActionRow()
              .addComponents(new MessageButton().setCustomId("find_hide").setLabel("Hide Details").setStyle("PRIMARY"))
              .addComponents(new MessageButton().setCustomId("find_close").setLabel("Close").setStyle("DANGER"));
            await interaction.editReply({ embeds: [detailed], components: [row] });
          } else if (button.customId == "find_hide") {
            const row = new MessageActionRow()
              .addComponents(new MessageButton().setCustomId("find_details").setLabel("Show Details").setStyle("PRIMARY"))
              .addComponents(new MessageButton().setCustomId("find_close").setLabel("Close").setStyle("DANGER"));
            await interaction.editReply({ embeds: [simple], components: [row] });
          } else if (button.customId == "find_close") {
            db.delete(`${interaction.user.id}.findstarted`);
            delete queries[interaction.id];
            db.set(`${interaction.user.id}.findquery`, queries);
            await interaction.deleteReply();
          }
          button.deferUpdate();
        });
      })
      .catch((err) => {
        console.log(err);
        db.delete(`${interaction.user.id}.findstarted`);
        return interaction.editReply({ content: "Error while searching for collection. Check for typos or try again.", ephemeral: true });
      });
  },
};
