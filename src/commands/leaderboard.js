const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const guildSchema = require("../schemas/guild-schema");
const metaSchema = require("../schemas/metadata-schema");
const botconfig = require("../botconfig.json");
const { getAsset } = require("../utils/get-asset");
const { parseTraits } = require("../utils/parse-traits");
const { indexAdvanced } = require("../utils/index-advanced");
const sdk = require("api")("@opensea/v1.0#595ks1ol33d7wpk");
const { default: axios } = require("axios");
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
    .setName("leaderboard")
    .setDescription("Get top ranks of a collection")
    .addStringOption((option) =>
      option.setName("collection-slug").setDescription("OpenSea Collection slug. Commmonly found in the URL of the collection.").setRequired(true)
    ),
  options: "[collection-slug]",
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
    await interaction.reply({
      content: "Searching for rarity ranks...",
      embeds: [],
    });
    await sdk["retrieving-a-single-collection"]({ collection_slug: slug }).then(async (res) => {
      const collection_contract = res.collection.primary_asset_contracts[0].address;
      const collection_name = res.collection.name;
      const collection_img = res.collection.image_url;

      var rankOBJ = await metaSchema.findOne({ slug: slug });
      if (!rankOBJ) {
        interaction.editReply({
          content: "Did not find that collection indexed yet. Queuing for rank calculation. Please check back later.",
          ephemeral: true,
        });
        await indexAdvanced(client, slug)
          .then(async (test) => {
            interaction.editReply({
              content: `<@${interaction.user.id}>, Finished indexing **${slug}**. Compiling top ranks.`,
            });
            rankOBJ = await metaSchema.findOne({ slug: slug });
          })
          .catch((err) => {
            return interaction.editReply({ content: err, ephemeral: true });
          });
      }

      var embeds = [];
      let ranks = rankOBJ.ranksArr;
      if (!ranks.length) {
        return interaction.editReply({ content: "Error while compiling ranked assets. Please try again in a moment." });
      }

      for (var i = 0; i < Math.min(ranks.length, 10); i++) {
        let token_id = ranks[i].token_id;
        let asset = await getAsset(client, slug, token_id);
        asset = asset.assetObject;
        const rank_norm = ranks[i].rank_norm;
        const rank_trait_count = ranks[i].rank_trait_count;
        const rank_norm_score = ranks[i].rarity_score_norm.toFixed(2);
        const rank_trait_score = ranks[i].rarity_score_trait.toFixed(2);
        let traits = asset.traits ? asset.traits : "Unrevealed";
        const trait_map = ranks[i].trait_map;

        var traitDesc = await parseTraits(client, traits, trait_map).catch((err) => console.log(err));

        let name = asset.name ? asset.name : `#${token_id}`;
        let image_url = asset.image_url ? asset.image_url : collection_img;
        if (image_url.substr(0, 7) == "ipfs://") {
          image_url = image_url.replace("ipfs://", "");
          image_url = `${botconfig.INFURA_IPFS}${image_url}`;
        }

        let OS_link = `https://opensea.io/assets/ethereum/${collection_contract}/${token_id}`;

        let embedRank = new Discord.MessageEmbed()
          .setTitle(`${name} | ${collection_name}`)
          .setURL(OS_link)
          .setImage(image_url)
          .addField(`Rank #${rank_norm}`, `*Trait Normalization* \n Rarity Score ${rank_norm_score}`)
          .addField(`Rank #${rank_trait_count}`, `*Trait Count Weighting* \n Rarity Score ${rank_trait_score}`)
          .setThumbnail(collection_img)
          .setFooter({
            text: `Slug: ${slug} • Token: ${token_id}`,
          })
          .setColor(44774);

        let embedTraits = new Discord.MessageEmbed()
          .setTitle(`${name} | ${collection_name}`)
          .setURL(OS_link)
          .setDescription(traitDesc)
          .setThumbnail(image_url)
          .setFooter({ text: `Slug: ${slug} • Token: ${token_id}` })
          .setColor(44774);

        embeds.push([embedRank, embedTraits]);
      }

      if (!embeds.length) {
        return interaction.editReply({
          content: "Error while compiling ranked assets. Please try again in a moment.",
        });
      }

      const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER").setDisabled(true),
        new MessageButton().setCustomId("leader_traits").setLabel("Show Traits").setStyle("PRIMARY"),
        new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS")
      );

      await interaction.editReply({
        content: " ­",
        embeds: [embeds[0][0]],
        components: [row],
      });

      let currQueries = db.get(`${interaction.user.id}.leaderquery`) != null ? db.get(`${interaction.user.id}.leaderquery`) : {};
      currQueries[interaction.id] = [Date.now(), embeds, 0]; // Date, embeds arr, curr index
      db.set(`${interaction.user.id}.leaderquery`, currQueries);

      const message = await interaction.fetchReply();

      const filter = (btn) => {
        return btn.user.id === interaction.user.id && btn.message.id == message.id;
      };

      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 1000 * 120,
      });

      collector.on("collect", async (button) => {
        let queries = db.get(`${interaction.user.id}.leaderquery`);
        if (!queries || !queries[interaction.id]) {
          return button.deferUpdate();
        }
        let embeds = queries[interaction.id][1];
        let currInd = queries[interaction.id][2];

        if (button.customId == "leader_traits") {
          const row = new MessageActionRow();
          if (currInd == embeds.length - 1) {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER"),
              new MessageButton().setCustomId("leader_rank").setLabel("Show Rank").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS").setDisabled(true)
            );
          } else if (currInd == 0) {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER").setDisabled(true),
              new MessageButton().setCustomId("leader_rank").setLabel("Show Rank").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS")
            );
          } else {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER"),
              new MessageButton().setCustomId("leader_rank").setLabel("Show Rank").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS")
            );
          }

          await interaction.editReply({
            embeds: [embeds[currInd][1]],
            components: [row],
          });
        } else if (button.customId == "leader_rank") {
          const row = new MessageActionRow();

          if (currInd == embeds.length - 1) {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER"),
              new MessageButton().setCustomId("leader_traits").setLabel("Show Traits").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS").setDisabled(true)
            );
          } else if (currInd == 0) {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER").setDisabled(true),
              new MessageButton().setCustomId("leader_traits").setLabel("Show Traits").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS")
            );
          } else {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER"),
              new MessageButton().setCustomId("leader_traits").setLabel("Show Traits").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS")
            );
          }
          await interaction.editReply({
            embeds: [embeds[currInd][0]],
            components: [row],
          });
        } else if (button.customId == "leader_next") {
          const row = new MessageActionRow();
          currInd += 1;
          if (currInd == embeds.length - 1) {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER"),
              new MessageButton().setCustomId("leader_traits").setLabel("Show Traits").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS").setDisabled(true)
            );
          } else {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER"),
              new MessageButton().setCustomId("leader_traits").setLabel("Show Traits").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS")
            );
          }

          await interaction.editReply({
            embeds: [embeds[currInd][0]],
            components: [row],
          });
        } else if (button.customId == "leader_prev") {
          const row = new MessageActionRow();
          currInd -= 1;
          if (currInd == 0) {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER").setDisabled(true),
              new MessageButton().setCustomId("leader_traits").setLabel("Show Traits").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS")
            );
          } else {
            row.addComponents(
              new MessageButton().setCustomId("leader_prev").setLabel("Previous").setStyle("DANGER"),
              new MessageButton().setCustomId("leader_traits").setLabel("Show Traits").setStyle("PRIMARY"),
              new MessageButton().setCustomId("leader_next").setLabel("Next").setStyle("SUCCESS")
            );
          }
          await interaction.editReply({
            embeds: [embeds[currInd][0]],
            components: [row],
          });
        }

        currQueries[interaction.id] = [Date.now(), embeds, currInd]; // Date, embeds arr, curr index
        db.set(`${interaction.user.id}.leaderquery`, currQueries);
        button.deferUpdate();
      });
    });
  },
};
