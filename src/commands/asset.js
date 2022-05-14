const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const botconfig = require('../botconfig.json');
const { getAsset } = require('../helpers/get-asset');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('asset')
        .setDescription('Get information of an asset.')
        .addStringOption(option => option.setName('collection-slug').setDescription('OpenSea Collection slug. Commmonly found in the URL of the collection.').setRequired(true))
        .addStringOption(option => option.setName('token-id').setDescription('NFT specific token id. Usually in name. Otherwise check txn for ID.').setRequired(true)),
    options: '[collection-slug] [token-id]',
    async execute(interaction, args, client) {
        let slug = interaction.options.getString('collection-slug');
        let token_id = interaction.options.getString('token-id');

        await interaction.reply({ content: 'Searching for asset...', embeds: [] });

        getAsset(client, slug, token_id).then(async (res) => {
            console.log(res);

            try {
                let asset = res.assetObject;
                let image_url = asset.image_url;
                let name = asset.name;
                let num_sales = (asset.num_sales ? String(asset.num_sales) : '0');
                var last_sale = 'None'
                if (asset.last_sale) {
                    let symbol = asset.last_sale.payment_token.symbol;
                    let usd = asset.last_sale.payment_token.usd_price;
                    let price_sold = asset.last_sale.total_price / Math.pow(10, 18);

                    switch (symbol) {
                        case 'ETH':
                            symbol = 'Ξ'
                            break;

                        default:
                            symbol = ' ' + symbol;
                            break;
                    }

                    last_sale = `${price_sold}${symbol}`
                }
                let top_bid = (asset.last_bid ? asset.last_bid : 'None');
                let traits = (asset.traits ? asset.traits : 'Unrevealed');
                let OS_link = asset.permalink;
                let collection = asset.asset_contract.name;

                console.log(traits);

                let embed = new Discord.MessageEmbed()
                    .setTitle(`${name}`)
                    .setURL(OS_link)
                    .setImage(image_url)
                    .addField('Last Sale', last_sale, true)
                    .addField('Total Sales', num_sales, true)
                    // .addField('Top Bid', top_bid, true)
                    .setFooter({ text: `${collection} • Token ${token_id}` })
                    .setColor(44774)

                return interaction.editReply({ content: ' ­', embeds: [embed] });
            } catch (err) {
                console.log(err);
                return interaction.editReply({ content: `Error parsing asset. Please try again.` });
            }

        }).catch((res) => {
            return interaction.editReply({ content: `Error: ${res.reason}` });
        });

    },
}