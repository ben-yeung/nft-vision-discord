const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const guildSchema = require('../schemas/guild-schema');
const botconfig = require('../botconfig.json');
const { getAsset } = require('../helpers/get-asset');
const { parseTraits } = require('../helpers/parse-traits');
const db = require('quick.db');

/*
    quick.db is used for command spam prevention
    quick.db is not a long term db solution in this context
    mongoDB is used for per guild collection storing long term
    while quick.db is for Discord command related tracking
*/
function pruneQueries(author) {
    let queries = db.get(`${author.id}.assetquery`)
    if (!queries) return

    for (const [key, val] of Object.entries(queries)) {
        if (Date.now() - val[2] >= 90000) {
            delete queries[key]
        }
    }
    db.set(`${author.id}.assetquery`, queries)
}

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

        pruneQueries(interaction.user);

        await interaction.reply({ content: 'Searching for asset...', embeds: [] });

        getAsset(client, slug, token_id).then(async (res) => {
            console.log(res);

            try {
                let asset = res.assetObject;
                let image_url = asset.image_url;
                let name = asset.name;
                let num_sales = (asset.num_sales ? String(asset.num_sales) : '0');
                var last_sale = 'None';
                var last_sale_date = '';
                if (asset.last_sale) {
                    let symbol;
                    let price_sold = asset.last_sale.total_price / Math.pow(10, 18);
                    var date = new Date(`${(asset.last_sale.event_timestamp).substring(0, 10)} 00:00`);
                    last_sale_date = `(${Number(date.getMonth()) + 1}/${date.getDate()}/${date.getFullYear()})`;

                    switch (asset.last_sale.payment_token.symbol) {
                        case 'ETH':
                            symbol = 'Ξ'
                            break;

                        default:
                            symbol = ' ' + symbol;
                            break;
                    }

                    last_sale = `${price_sold}${symbol} [Etherscan](https://etherscan.io/tx/${asset.last_sale.transaction.transaction_hash})`;
                }
                let traits = (asset.traits ? asset.traits : 'Unrevealed');
                let OS_link = asset.permalink;
                let collection = asset.asset_contract.name;

                var traitDesc = await parseTraits(client, traits).catch(err => console.log(err));

                const row = new MessageActionRow()
                    .addComponents(new MessageButton()
                        .setCustomId('asset_traits')
                        .setLabel('Show Traits')
                        .setStyle('SUCCESS')
                    );

                let embed = new Discord.MessageEmbed()
                    .setTitle(`${name}`)
                    .setURL(OS_link)
                    .setImage(image_url)
                    .addField(`Last Sale ${last_sale_date}`, last_sale, true)
                    .addField('Total Sales', num_sales, true)
                    .setFooter({ text: `${collection} • Token ${token_id}` })
                    .setColor(44774)

                let embedTraits = new Discord.MessageEmbed()
                    .setTitle(`${name}`)
                    .setURL(OS_link)
                    .setDescription(traitDesc)
                    .setThumbnail(image_url)
                    .setFooter({ text: `${collection} • Token ${token_id}` })
                    .setColor(44774)

                await interaction.editReply({ content: ' ­', embeds: [embed], components: [row] });

                let currQueries = (db.get(`${interaction.user.id}.assetquery`) != null ? db.get(`${interaction.user.id}.assetquery`) : {});
                currQueries[interaction.id] = [embed, embedTraits, Date.now()];
                db.set(`${interaction.user.id}.assetquery`, currQueries)

                const message = await interaction.fetchReply();

                const filter = (btn) => {
                    return btn.user.id === interaction.user.id && btn.message.id == message.id;
                }

                const collector = interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 1000 * 60
                })

                collector.on('collect', async (button) => {

                    let queries = db.get(`${interaction.user.id}.assetquery`);
                    if (!queries || !queries[interaction.id]) {
                        return button.deferUpdate();
                    }
                    let salesEmbed = queries[interaction.id][0];
                    let traitsEmbed = queries[interaction.id][1];

                    if (button.customId == 'asset_traits') {
                        const row = new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setCustomId('asset_sales')
                                .setLabel('Show Sales')
                                .setStyle('SUCCESS')
                            );
                        await interaction.editReply({ embeds: [traitsEmbed], components: [row] });
                    } else if (button.customId == 'asset_sales') {
                        const row = new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setCustomId('asset_traits')
                                .setLabel('Show Traits')
                                .setStyle('SUCCESS')
                            );
                        await interaction.editReply({ embeds: [salesEmbed], components: [row] });
                    }
                    button.deferUpdate();
                })

            } catch (err) {
                console.log(err);
                return interaction.editReply({ content: `Error parsing asset. Please try again.` });
            }

        }).catch((res) => {
            return interaction.editReply({ content: `Error: ${res.reason}` });
        });

    },
}