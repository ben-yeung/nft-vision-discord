const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#bg4ikl1mk428b');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('find')
        .setDescription('Retrieve information for a given collection. View stats, royalties, fp, etc')
        .addStringOption(option => option.setName('collection-slug').setDescription('OpenSea Collection slug. Commmonly found in the URL of the collection.').setRequired(true)),
    options: '[collection-slug]',
    async execute(interaction, args, client) {

        sdk['retrieving-a-single-collection']({ collection_slug: interaction.options.getString('collection-slug') })
            .then(res => {

                let stats = res.collection.stats;
                let currFloor = stats.floor_price;
                let totalSupply = stats.total_supply;
                let numOwners = stats.num_owners;
                let totalVol = Number(stats.total_volume)
                let royalty = (Number(res.collection.dev_seller_fee_basis_points) + Number(res.collection.opensea_seller_fee_basis_points)) / 100;

                let name = res.collection.name;
                let imageThumb = res.collection.image_url;
                let discordURL = res.collection.discord_url;
                let website = res.collection.external_url;
                let twitterUser = res.collection.twitter_username;
                let openSea = 'https://opensea.io/collection/' + res.collection.slug;

                let desc = `**Floor Price:** ${currFloor}Ξ \n **Total Volume:** ${totalVol.toFixed(0)}Ξ \n\n [OpenSea](${openSea})`
                if (discordURL) desc += ` • [Discord](${discordURL})`;
                if (website) desc += ` • [Website](${website})`;
                if (twitterUser) desc += ` • [Twitter](https://twitter.com/${twitterUser})`;

                let findEmbed = new Discord.MessageEmbed()
                    .setTitle(`${name}`)
                    .setDescription(desc)
                    .setThumbnail(imageThumb)
                    .setColor(44774)
                    .setFooter({
                        text: `Royalties: ${royalty}% | Total Supply: ${totalSupply} | Owners: ${numOwners}`
                    })

                return interaction.reply({ embeds: [findEmbed] });

            })
            .catch(err => {
                console.log(err);
                return interaction.reply('Error while searching for collection. Check for typos or try again.')
            });


    },
}