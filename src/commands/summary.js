const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('summary')
        .setDescription('Returns a floor price summary for each collection being monitored. Work in progress'),
    options: '',
    async execute(interaction, args, client) {
        try {
            let guildRes = await guildSchema.findOne({
                guild_id: interaction.guild.id
            });

            // If guild is in mongoDB, check collections
            // Else continue
            if (guildRes) {
                let collects = guildRes.collections;
                let summaries = [];
                for (let i = 0; i < collects.length; i++) {
                    let c = collects[i];
                    sdk['retrieving-a-single-collection']({ collection_slug: c.slug })
                        .then(async (res) => {
                            let stats = res.collection.stats;
                            let currFloor = stats.floor_price;
                            let totalSupply = stats.total_supply;
                            let numOwners = stats.num_owners;
                            let royalty = (Number(res.collection.dev_seller_fee_basis_points) + Number(res.collection.opensea_seller_fee_basis_points)) / 100;

                            let name = res.collection.name;
                            let imageThumb = res.collection.image_url;
                            let discordURL = res.collection.discord_url;
                            let website = res.collection.external_url;
                            let twitterUser = res.collection.twitter_username;
                            let openSea = 'https://opensea.io/collection/' + c.slug;

                            let desc = `\n\n [OpenSea](${openSea})`
                            if (discordURL) desc += ` • [Discord](${discordURL})`;
                            if (website) desc += ` • [Website](${website})`;
                            if (twitterUser) desc += ` • [Twitter](https://twitter.com/${twitterUser})`;

                        })
                        .catch(err => console.error(err));
                }
            }

        } catch (err) {
            console.log(err);
        }
        return interaction.reply('Under construction :)');

    },
}