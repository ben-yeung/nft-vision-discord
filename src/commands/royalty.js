const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#bg4ikl1mk428b');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('royalty')
        .setDescription('Calculate the amount of ETH received given you sold a project at a specified price.')
        .addStringOption(option => option.setName('collection-slug').setDescription('OpenSea Collection slug. Commmonly found in the URL of the collection.').setRequired(true))
        .addNumberOption(option => option.setName('amount').setDescription('Price sold in ETH.').setRequired(true)),
    options: '[collection-slug] [amount]',
    async execute(interaction, args, client) {

        let amount = interaction.options.getNumber('amount');

        sdk['retrieving-a-single-collection']({ collection_slug: interaction.options.getString('collection-slug') })
            .then(res => {
                let stats = res.collection.stats;
                let totalSupply = stats.total_supply;
                let numOwners = stats.num_owners;
                let royalty = (Number(res.collection.dev_seller_fee_basis_points) + Number(res.collection.opensea_seller_fee_basis_points)) / 100;
                let afterFees = Number((amount - ((royalty / 100) * amount)).toFixed(4));
                let name = res.collection.name;
                let imageThumb = res.collection.image_url;
                let discordURL = res.collection.discord_url;
                let website = res.collection.external_url;
                let twitterUser = res.collection.twitter_username;
                let openSea = 'https://opensea.io/collection/' + res.collection.slug;

                let desc = `**If you sold at:** ${amount}Ξ (~$${client.convertETH(amount).toLocaleString("en-US")}) \n **You would receive:** ${afterFees.toLocaleString("en-US")}Ξ (~$${client.convertETH(afterFees).toLocaleString("en-US")}) \n\n [OpenSea](${openSea})`
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