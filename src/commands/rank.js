const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const guildSchema = require("../schemas/guild-schema");
const metaSchema = require("../schemas/metadata-schema");
const botconfig = require("../botconfig.json");
const { getAsset } = require("../utils/get-asset");
const { parseTraits } = require("../utils/parse-traits");
const { indexAdvanced } = require("../utils/index-advanced");
const db = require("quick.db");
const ms = require("ms");

/*
    quick.db is used for command spam prevention
    quick.db is not a long term db solution in this context
    mongoDB is used for per guild collection storing long term
    while quick.db is for Discord command related tracking
*/
function pruneQueries(author) {
  let queries = db.get(`${author.id}.assetquery`);
  if (!queries) return;

  for (const [key, val] of Object.entries(queries)) {
    if (Date.now() - val[3] >= 90000) {
      delete queries[key];
    }
  }
  db.set(`${author.id}.assetquery`, queries);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
    .setName("rank")
    .setDescription("Get rank rarity for a given NFT.")
    .addStringOption((option) => option.setName("collection-slug").setDescription("OpenSea Collection slug. Commmonly found in the URL of the collection.").setRequired(true))
    .addStringOption((option) => option.setName("token-id").setDescription("NFT specific token id. Usually in name. Otherwise check txn for ID.").setRequired(true)),
  options: "[collection-slug] [token-id]",
  async execute(interaction, args, client) {
    if (db.get(`${interaction.user.id}.assetstarted`) && Date.now() - db.get(`${interaction.user.id}.assetstarted`) <= 10000) {
      return interaction.reply({
        content: `Please wait ${ms(10000 - (Date.now() - db.get(`${interaction.user.id}.assetstarted`)))} before starting another query!`,
        ephemeral: true,
      });
    } else {
      db.set(`${interaction.user.id}.assetstarted`, Date.now());
      pruneQueries(interaction.user);
    }

    let slug = interaction.options.getString("collection-slug");
    let token_id = interaction.options.getString("token-id");

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
      if (res.aliases && res.aliases[slug]) {
        slug = res.aliases[slug];
        aliasFound = true;
      }
    } catch (err) {
      console.log("Err fetching aliases for guild.");
    }

    getAsset(client, slug, token_id)
      .then(async (res) => {
        await interaction.reply({
          content: "Searching for rarity ranks...",
          embeds: [],
        });
        try {
          let asset = res.assetObject;
          let image_url = asset.image_url;
          var animation_url = "False";
          if (asset.animation_url) {
            animated = true;
            animation_url = `True • [View](${asset.animation_url})`;
          }

          var rankOBJ = await metaSchema.findOne({ slug: slug });
          if (!rankOBJ) {
            interaction.editReply({
              content: "Did not find that collection indexed yet. Queuing for rank calculation. Please check back later.",
              ephemeral: true,
            });
            await indexAdvanced(client, slug)
              .then(async (test) => {
                interaction.editReply({
                  content: `<@${interaction.user.id}>, Finished indexing **${slug}**. Searching rarity rank for token ${token_id}`,
                });
                rankOBJ = await metaSchema.findOne({ slug: slug });
              })
              .catch((err) => {
                return interaction.editReply({ content: err, ephemeral: true });
              });
          }

          rankOBJ = rankOBJ.ranks[token_id];
          const rank_norm = rankOBJ.rank_norm;
          const rank_trait_count = rankOBJ.rank_trait_count;
          const rank_norm_score = rankOBJ.rarity_score_norm.toFixed(2);
          const rank_trait_score = rankOBJ.rarity_score_trait.toFixed(2);
          let traits = asset.traits ? asset.traits : "Unrevealed";
          const trait_map = rankOBJ.trait_map;

          var traitDesc = await parseTraits(client, traits, trait_map).catch((err) => console.log(err));
          traitDesc += `**Animated:** ${animation_url}`;

          const OSEmoji = client.emojis.cache.get("986139643399512105");
          const LooksEmoji = client.emojis.cache.get("986139630845980713");

          let name = asset.name ? asset.name : `#${token_id}`;

          var owner_user = asset.owner.address.substring(2, 8).toUpperCase();
          if (asset.owner.user) owner_user = asset.owner.user.username ? asset.owner.user.username : owner_user;
          let owner = `[${owner_user}](https://opensea.io/${asset.owner.address})`;

          let allSales = res.sales;

          let num_sales = allSales.length;
          const last_sale = res.last_sale;
          var last_sale_date = last_sale.date;
          var last_sale_formatted = "None";
          if (last_sale != "None") {
            let symbol = last_sale.symbol;
            let usd = currency.format(last_sale.usd);
            let marketplace = last_sale.name;

            switch (marketplace) {
              case "OpenSea":
                marketplace = OSEmoji;
                break;
              case "LooksRare":
                marketplace = LooksEmoji;
                break;
              default:
                marketplace = "";
                break;
            }

            switch (symbol) {
              case "ETH":
                symbol = "Ξ";
                break;

              default:
                break;
            }

            last_sale_formatted = `${marketplace} ${last_sale.price}${symbol} (${usd})`;
          }

          var salesHistory = "";
          if (num_sales > 0) {
            let datedSales = allSales.sort((a, b) => b.date - a.date);
            for (var i = 0; i < num_sales; i++) {
              let sale = datedSales[i];
              let date = new Date(sale.date * 1000);
              let symbol = sale.symbol;
              let usd = currency.format(sale.usd);
              let marketplace = sale.name;

              switch (marketplace) {
                case "OpenSea":
                  marketplace = OSEmoji;
                  break;
                case "LooksRare":
                  marketplace = LooksEmoji;
                  break;
                default:
                  marketplace = "";
                  break;
              }

              switch (symbol) {
                case "ETH":
                  symbol = "Ξ";
                  break;

                default:
                  break;
              }

              salesHistory += `${marketplace} \`${dateFormat.format(date)}\` • **${sale.price}${symbol}** *(${usd})* \n`;
            }
          }

          let listings = res.listings;
          var curr_listings = "N/A";
          if (listings && listings.length > 0) {
            curr_listings = "";

            for (var i = 0; i < listings.length; i++) {
              let symbol = listings[i].symbol;
              let marketplace = listings[i].name;

              switch (marketplace) {
                case "OpenSea":
                  marketplace = OSEmoji;
                  break;
                case "LooksRare":
                  marketplace = LooksEmoji;
                  break;
                default:
                  marketplace = "";
                  break;
              }
              switch (symbol) {
                case "ETH":
                  symbol = "Ξ";
                  break;

                default:
                  break;
              }
              let usd = currency.format(listings[i].usd);
              curr_listings += `${marketplace} ${listings[i].price}${symbol} (${usd}) \n`;
            }
          }

          let bids = res.offers;
          var highest_bid = "None";
          if (bids && bids.length > 0) {
            bids = bids.sort((a, b) => b.usd - a.usd);
            let symbol = bids[0].symbol;
            let marketplace = bids[0].name;

            switch (marketplace) {
              case "OpenSea":
                marketplace = OSEmoji;
                break;
              case "LooksRare":
                marketplace = LooksEmoji;
                break;
              default:
                marketplace = "";
                break;
            }

            switch (symbol) {
              case "ETH":
                symbol = "Ξ";
                break;

              default:
                break;
            }
            let usd = currency.format(bids[0].usd);
            let price = bids[0].price;
            highest_bid = `${marketplace} ${price}${symbol} (${usd})`;
          }

          let sales = res.sales;
          var highest_sale = "None";
          if (sales && sales.length > 0) {
            sales = sales.sort((a, b) => b.usd - a.usd);
            let symbol = sales[0].symbol;
            let marketplace = sales[0].name;

            switch (marketplace) {
              case "OpenSea":
                marketplace = OSEmoji;
                break;
              case "LooksRare":
                marketplace = LooksEmoji;
                break;
              default:
                marketplace = "";
                break;
            }
            switch (symbol) {
              case "ETH":
                symbol = "Ξ";
                break;

              default:
                break;
            }
            let usd = currency.format(sales[0].usd);
            let price = sales[0].price;
            highest_sale = `${marketplace} ${price}${symbol} (${usd})`;
          }

          let OS_link = asset.permalink;
          let collection = asset.asset_contract.name;
          let collection_img = asset.asset_contract.image_url;

          const row = new MessageActionRow().addComponents(
            new MessageButton().setCustomId("asset_traits").setLabel("Show Traits").setStyle("SUCCESS"),
            new MessageButton().setCustomId("asset_history").setLabel("Sales History").setStyle("PRIMARY"),
            new MessageButton().setCustomId("asset_sales").setLabel("Show Stats").setStyle("SECONDARY")
          );

          let embedRank = new Discord.MessageEmbed()
            .setTitle(`${name} | ${collection}`)
            .setURL(OS_link)
            .setImage(image_url)
            .addField(`Rank #${rank_norm}`, `*Trait Normalization* \n Rarity Score ${rank_norm_score}`)
            .addField(`Rank #${rank_trait_count}`, `*Trait Count Weighting* \n Rarity Score ${rank_trait_score}`)
            .setThumbnail(collection_img)
            .setFooter({
              text: `Slug: ${slug} • Token: ${token_id} • Total Sales: ${num_sales}`,
            })
            .setColor(44774);

          let embed = new Discord.MessageEmbed()
            .setTitle(`${name} | ${collection}`)
            .setURL(OS_link)
            .setImage(image_url)
            .addField(`Owned By`, owner)
            .addField(`Listed For`, curr_listings)
            .setThumbnail(collection_img)
            .setFooter({
              text: `Slug: ${slug} • Token: ${token_id} • Total Sales: ${num_sales}`,
            })
            .setColor(44774);

          if (highest_bid != "None") {
            embed.addField(`Highest Bid`, highest_bid);
          }

          embed.addField(`Highest Sale`, highest_sale).addField(`Last Sale`, last_sale_formatted);

          let embedTraits = new Discord.MessageEmbed()
            .setTitle(`${name} | ${collection}`)
            .setURL(OS_link)
            .setDescription(traitDesc)
            .setThumbnail(image_url)
            .setFooter({ text: `Slug: ${slug} • Token: ${token_id}` })
            .setColor(44774);

          let embedSales = new Discord.MessageEmbed()
            .setTitle(`${name} | ${collection}`)
            .setURL(OS_link)
            .setThumbnail(image_url)
            .setFooter({ text: `Slug: ${slug} • Token: ${token_id}` })
            .setColor(44774);

          if (salesHistory != "") {
            embedSales.setDescription(salesHistory);
          } else {
            embedSales.setDescription("No sales history found yet.");
          }

          await interaction.editReply({
            content: " ­",
            embeds: [embedRank],
            components: [row],
          });

          let currQueries = db.get(`${interaction.user.id}.assetquery`) != null ? db.get(`${interaction.user.id}.assetquery`) : {};
          currQueries[interaction.id] = [Date.now(), embed, embedTraits, embedSales, embedRank];
          db.set(`${interaction.user.id}.assetquery`, currQueries);

          const message = await interaction.fetchReply();

          const filter = (btn) => {
            return btn.user.id === interaction.user.id && btn.message.id == message.id;
          };

          const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 1000 * 90,
          });

          collector.on("collect", async (button) => {
            let queries = db.get(`${interaction.user.id}.assetquery`);
            if (!queries || !queries[interaction.id]) {
              return button.deferUpdate();
            }
            let salesEmbed = queries[interaction.id][1];
            let traitsEmbed = queries[interaction.id][2];
            let historyEmbed = queries[interaction.id][3];
            let rankEmbed = queries[interaction.id][4];

            if (button.customId == "asset_traits") {
              const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId("asset_sales").setLabel("Show Stats").setStyle("SUCCESS"),
                new MessageButton().setCustomId("asset_history").setLabel("Sales History").setStyle("PRIMARY"),
                new MessageButton().setCustomId("asset_rank").setLabel("Show Rank").setStyle("SECONDARY")
              );
              await interaction.editReply({
                embeds: [traitsEmbed],
                components: [row],
              });
            } else if (button.customId == "asset_sales") {
              const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId("asset_traits").setLabel("Show Traits").setStyle("SUCCESS"),
                new MessageButton().setCustomId("asset_history").setLabel("Sales History").setStyle("PRIMARY"),
                new MessageButton().setCustomId("asset_rank").setLabel("Show Rank").setStyle("SECONDARY")
              );
              await interaction.editReply({
                embeds: [salesEmbed],
                components: [row],
              });
            } else if (button.customId == "asset_history") {
              const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId("asset_sales").setLabel("Show Stats").setStyle("SUCCESS"),
                new MessageButton().setCustomId("asset_traits").setLabel("Show Traits").setStyle("PRIMARY"),
                new MessageButton().setCustomId("asset_rank").setLabel("Show Rank").setStyle("SECONDARY")
              );
              await interaction.editReply({
                embeds: [historyEmbed],
                components: [row],
              });
            } else if (button.customId == "asset_rank") {
              const row = new MessageActionRow().addComponents(
                new MessageButton().setCustomId("asset_sales").setLabel("Show Stats").setStyle("SUCCESS"),
                new MessageButton().setCustomId("asset_traits").setLabel("Show Traits").setStyle("PRIMARY"),
                new MessageButton().setCustomId("asset_history").setLabel("Sales History").setStyle("SECONDARY")
              );
              await interaction.editReply({
                embeds: [rankEmbed],
                components: [row],
              });
            }
            button.deferUpdate();
          });
        } catch (err) {
          console.log(err);
          return interaction.editReply({
            content: `Error parsing asset. Please try again in a moment.`,
            ephemeral: true,
          });
        }
      })
      .catch((res) => {
        return interaction.editReply({
          content: `Error parsing asset. Please try again in a moment.`,
          ephemeral: true,
        });
      });
  },
};
