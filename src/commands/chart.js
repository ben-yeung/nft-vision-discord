const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageActionRow, MessageButton, MessageAttachment } = require("discord.js");
const guildSchema = require("../schemas/guild-schema");
const botconfig = require("../botconfig.json");
const sdk = require("api")("@opensea/v1.0#595ks1ol33d7wpk");
const db = require("quick.db");
const ms = require("ms");
const { getChart } = require("../utils/get-chart");

/*
    quick.db is used for command spam prevention
    quick.db is not a long term db solution in this context
    mongoDB is used for per guild collection storing long term
    while quick.db is for Discord command related tracking
*/
function pruneQueries(author) {
  let queries = db.get(`${author.id}.chartquery`);
  if (!queries) return;

  for (const [key, val] of Object.entries(queries)) {
    if (Date.now() - val[0] >= 90000) {
      delete queries[key];
    }
  }
  db.set(`${author.id}.chartquery`, queries);
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chart")
    .setDescription("Chart a given collection's historical volume.")
    .addStringOption((option) =>
      option
        .setName("collection-slug")
        .setDescription("OpenSea Collection slug. Commmonly found in the URL of the collection.")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option.setName("show-outliers").setDescription("Whether or not to show outliers in chart. Defaults to False")
    ),
  options: "[collection-slug] (show-outliers)",
  async execute(interaction, args, client) {
    if (
      db.get(`${interaction.user.id}.chartstarted`) &&
      Date.now() - db.get(`${interaction.user.id}.chartstarted`) <= 10000
    ) {
      return interaction.reply({
        content: `Please wait ${ms(
          10000 - (Date.now() - db.get(`${interaction.user.id}.chartstarted`))
        )} before starting another query!`,
        ephemeral: true,
      });
    } else {
      db.set(`${interaction.user.id}.chartstarted`, Date.now());
      pruneQueries(interaction.user);
    }

    let slug = interaction.options.getString("collection-slug");
    const showOutliers = interaction.options.getBoolean("show-outliers")
      ? interaction.options.getBoolean("show-outliers")
      : false;
    var aliasFound = false;

    // Check if alias exists
    try {
      let res = await guildSchema.findOne({
        guild_id: interaction.guild.id,
      });
      if (!res) {
        await new guildSchema({
          guild_id: interaction.guild.id,
          guild_name: interaction.guild.name,
          alerts_channel: "",
        }).save();
      }
      res = await guildSchema.findOne({
        guild_id: interaction.guild.id,
      });
      if (res.aliases && res.aliases[slug]) {
        slug = res.aliases[slug];
        aliasFound = true;
      }
    } catch (err) {
      console.log("Err fetching aliases for guild.");
    }

    await interaction.reply({
      content: "Generating chart...",
      embeds: [],
    });

    sdk["retrieving-a-single-collection"]({
      collection_slug: slug,
    })
      .then(async (res) => {
        const thumb = res.collection.image_url;
        const name = res.collection.name;
        let contract = "https://etherscan.io/address/" + res.collection.primary_asset_contracts[0].address;
        let discordURL = res.collection.discord_url;
        let website = res.collection.external_url;
        let twitterUser = res.collection.twitter_username;
        let openSea = "https://opensea.io/collection/" + res.collection.slug;
        let desc = `[OpenSea](${openSea}) • [Etherscan](${contract})`;

        if (discordURL) desc += ` • [Discord](${discordURL})`;
        if (website) desc += ` • [Website](${website})`;
        if (twitterUser) desc += ` • [Twitter](https://twitter.com/${twitterUser})`;

        getChart(client, res.collection) // see utils/get-chart
          .then(async (chartRes) => {
            let chart = chartRes.chart[0];
            const attach = new MessageAttachment(chart, "chart.jpg");
            let filteredChart = chartRes.chart[1];
            const attach2 = new MessageAttachment(filteredChart, "chart.jpg");
            let numPoints = chartRes.numPoints;
            const finalAttach = showOutliers ? attach : attach2;

            let embed = new MessageEmbed()
              .setTitle(`${name} (Last ${numPoints} Sales)`)
              .setDescription(desc)
              .setImage("attachment://chart.jpg")
              .setThumbnail(thumb)
              .setFooter({ text: `x-axis is hours since sale • Slug: ${slug} ` })
              .setTimestamp()
              .setColor(44774);

            const row = new MessageActionRow().addComponents(
              new MessageButton().setCustomId("chart_showoutlier").setLabel("Show Outliers").setStyle("SUCCESS")
            );

            return interaction.editReply({
              content: " ­",
              embeds: [embed],
              files: [finalAttach],
            });

            let currQueries =
              db.get(`${interaction.user.id}.chartquery`) != null ? db.get(`${interaction.user.id}.chartquery`) : {};
            currQueries[interaction.id] = [Date.now(), chart, filteredChart, embed];
            db.set(`${interaction.user.id}.chartquery`, currQueries);

            const message = await interaction.fetchReply();

            const filter = (btn) => {
              return btn.user.id === interaction.user.id && btn.message.id == message.id;
            };

            const collector = interaction.channel.createMessageComponentCollector({
              filter,
              time: 1000 * 90,
            });

            collector.on("collect", async (button) => {
              let queries = db.get(`${interaction.user.id}.chartquery`);
              if (!queries || !queries[interaction.id]) {
                return button.deferUpdate();
              }
              let chart = queries[interaction.id][1];
              let filteredChart = queries[interaction.id][2];
              let attach = new MessageAttachment(chart, "chart2.jpg");
              let attach2 = new MessageAttachment(filteredChart, "chart2.jpg");
              let embed = new MessageEmbed()
                .setTitle(`${name} (Last ${numPoints} Sales)`)
                .setDescription(desc)
                .setImage("attachment://chart2.jpg")
                .setThumbnail(thumb)
                .setFooter({ text: `x-axis is hours since sale • Slug: ${slug} ` })
                .setTimestamp()
                .setColor(44774);

              console.log(attach);

              if (button.customId == "chart_showoutlier") {
                const row = new MessageActionRow().addComponents(
                  new MessageButton().setCustomId("chart_hideoutlier").setLabel("Hide Outliers").setStyle("DANGER")
                );
                await interaction.editReply({
                  embeds: [embed],
                  files: [attach],
                  components: [row],
                });
              } else if (button.customId == "chart_hideoutlier") {
                const row = new MessageActionRow().addComponents(
                  new MessageButton().setCustomId("chart_showoutlier").setLabel("Show Outliers").setStyle("SUCCESS")
                );
                await interaction.editReply({
                  embeds: [embed],
                  files: [attach2],
                  components: [row],
                });
              }
              button.deferUpdate();
            });
          })
          .catch((err) => {
            console.log(err);
            return interaction.editReply({
              content: "Error generating chart.",
              embeds: [],
            });
          });
      })
      .catch((err) => {
        return interaction.editReply({
          content: err.reason,
        });
      });
  },
};
