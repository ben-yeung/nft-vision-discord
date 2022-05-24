const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const guildSchema = require('../schemas/guild-schema');
const metaSchema = require('../schemas/metadata-schema');
const botconfig = require('../botconfig.json');
const { getAsset } = require('../utils/get-asset');
const { parseTraits } = require('../utils/parse-traits');
const { indexCollection } = require('../utils/index-collection');
const db = require('quick.db');
const ms = require('ms');

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
        if (Date.now() - val[3] >= 90000) {
            delete queries[key]
        }
    }
    db.set(`${author.id}.assetquery`, queries)
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Get rank rarity for a given NFT.')
        .addStringOption(option => option.setName('collection-slug').setDescription('OpenSea Collection slug. Commmonly found in the URL of the collection.').setRequired(true))
        .addStringOption(option => option.setName('token-id').setDescription('NFT specific token id. Usually in name. Otherwise check txn for ID.').setRequired(true)),
    options: '[collection-slug] [token-id]',
    async execute(interaction, args, client) {

        if (db.get(`${interaction.user.id}.assetstarted`) && Date.now() - db.get(`${interaction.user.id}.assetstarted`) <= 10000) {
            return interaction.reply({ content: `Please wait ${ms(10000 - (Date.now() - db.get(`${interaction.user.id}.assetstarted`)))} before starting another query!`, ephemeral: true })
        } else {
            db.set(`${interaction.user.id}.assetstarted`, Date.now())
            pruneQueries(interaction.user);
        }

        let slug = interaction.options.getString('collection-slug');
        let token_id = interaction.options.getString('token-id');

        getAsset(client, slug, token_id).then(async (res) => {
            await interaction.reply({ content: 'Searching for rarity ranks...', embeds: [] });
            try {
                let asset = res.assetObject;
                let image_url = asset.image_url;
                var animation_url = 'False';
                if (asset.animation_url) {
                    animated = true;
                    animation_url = `True • [View](${asset.animation_url})`;
                }

                var rankOBJ = await metaSchema.findOne({ slug: slug });
                if (!rankOBJ) {
                    interaction.editReply({ content: 'Did not find that collection indexed yet. Queuing for rank calculation. Please check back later.', ephemeral: true })
                    indexCollection(client, slug).then(test => {
                        return interaction.editReply({ content: `<@${interaction.user.id}>, Finished indexing **${slug}**.` })
                    }).catch(err => {
                        return interaction.editReply({ content: err, ephemeral: true });
                    });

                    return;
                }
                rankOBJ = rankOBJ.ranks[token_id]
                const rank_norm = rankOBJ.rank_norm;
                const rank_trait_count = rankOBJ.rank_trait_count;
                const rank_norm_score = rankOBJ.rarity_score_norm.toFixed(2);
                const rank_trait_score = rankOBJ.rarity_score_trait.toFixed(2);
                const trait_map = rankOBJ.trait_map;

                let name = (asset.name ? asset.name : `#${token_id}`);
                var owner_user = ((asset.owner.address).substring(2, 8)).toUpperCase();
                if (asset.owner.user)
                    owner_user = (asset.owner.user.username ? asset.owner.user.username : owner_user)
                let owner = `[${owner_user}](https://opensea.io/${asset.owner.address})`
                let num_sales = (asset.num_sales ? String(asset.num_sales) : '0');
                var last_sale = 'None';
                var last_sale_date = '';
                if (asset.last_sale) {
                    let symbol;
                    let price_sold = asset.last_sale.total_price / Math.pow(10, 18);
                    var date = new Date(`${(asset.last_sale.event_timestamp).substring(0, 10)} 00:00`);
                    last_sale_date = `(${Number(date.getMonth()) + 1}/${date.getDate()}/${date.getFullYear()})`;
                    let usd = `${currency.format((Number(price_sold) * Number(asset.last_sale.payment_token.usd_price)))}`;

                    switch (asset.last_sale.payment_token.symbol) {
                        case 'ETH':
                            symbol = 'Ξ'
                            break;

                        default:
                            symbol = ' ' + asset.last_sale.payment_token.symbol;
                            break;
                    }

                    last_sale = `${price_sold}${symbol} (${usd})`;
                }

                let listings = res.listings;
                var curr_listing = 'N/A';
                if (listings && listings.length > 0) {
                    let symbol;
                    switch (listings[0].payment_token_contract.symbol) {
                        case 'ETH':
                            symbol = 'Ξ'
                            break;

                        default:
                            symbol = ' ' + listings[0].payment_token_contract.symbol;
                            break;
                    }
                    let usd = `${currency.format(Number(listings[0].current_price / Math.pow(10, 18)) * Number(listings[0].payment_token_contract.usd_price))}`;
                    curr_listing = `${Number(listings[0].current_price / Math.pow(10, 18)).toFixed(4)}${symbol} (${usd})`;
                }

                let bids = res.bids;
                var highest_bid = 'None';
                if (bids && bids.length > 0) {
                    let symbol;
                    switch (bids[0].payment_token_contract.symbol) {
                        case 'ETH':
                            symbol = 'Ξ'
                            break;

                        default:
                            symbol = ' ' + bids[0].payment_token_contract.symbol;
                            break;
                    }
                    let usd = `${currency.format((Number(bids[0].current_price / Math.pow(10, 18)) * Number(bids[0].payment_token_contract.usd_price)))}`;
                    highest_bid = `${bids[0].current_price / Math.pow(10, 18)}${symbol} (${usd})`
                }

                let sales = res.sales;
                var highest_sale = 'None';
                if (sales && sales.length > 0) {
                    let symbol;
                    switch (sales[0].payment_token.symbol) {
                        case 'ETH':
                            symbol = 'Ξ'
                            break;

                        default:
                            symbol = ' ' + sales[0].payment_token.symbol;
                            break;
                    }
                    let usd = `${currency.format((Number(sales[0].total_price / Math.pow(10, 18)) * Number(sales[0].payment_token.usd_price)))}`;
                    highest_sale = `${sales[0].total_price / Math.pow(10, 18)}${symbol} (${usd})`
                }

                let traits = (asset.traits ? asset.traits : 'Unrevealed');
                let OS_link = asset.permalink;
                let collection = asset.asset_contract.name;
                let collection_img = asset.asset_contract.image_url;

                var traitDesc = await parseTraits(client, traits, trait_map).catch(err => console.log(err));
                traitDesc += `**Animated:** ${animation_url}`

                const row = new MessageActionRow()
                    .addComponents(new MessageButton()
                        .setCustomId('asset_sales')
                        .setLabel('Show Sales')
                        .setStyle('SUCCESS')
                    ).addComponents(new MessageButton()
                        .setCustomId('asset_traits')
                        .setLabel('Show Traits')
                        .setStyle('PRIMARY')
                    );

                let embedRank = new Discord.MessageEmbed()
                    .setTitle(`${name} | ${collection}`)
                    .setURL(OS_link)
                    .setImage(image_url)
                    .addField(`Rank #${rank_norm}`, `*Trait Normalization* \n Rarity Score ${rank_norm_score}`)
                    .addField(`Rank #${rank_trait_count}`, `*Trait Count Weighting* \n Rarity Score ${rank_trait_score}`)
                    .setThumbnail(collection_img)
                    .setFooter({ text: `Slug: ${slug} • Token: ${token_id} • Total Sales: ${num_sales}` })
                    .setColor(44774)

                let embedSales = new Discord.MessageEmbed()
                    .setTitle(`${name} | ${collection}`)
                    .setURL(OS_link)
                    .setImage(image_url)
                    .addField(`Owned By`, owner)
                    .addField(`Listed For`, curr_listing)
                    .addField(`Highest Bid`, highest_bid)
                    .addField(`Highest Sale`, highest_sale)
                    .addField(`Last Sale`, last_sale)
                    .setThumbnail(collection_img)
                    .setFooter({ text: `Slug: ${slug} • Token: ${token_id} • Total Sales: ${num_sales}` })
                    .setColor(44774)

                let embedTraits = new Discord.MessageEmbed()
                    .setTitle(`${name} | ${collection}`)
                    .setURL(OS_link)
                    .setDescription(traitDesc)
                    .setThumbnail(image_url)
                    .setFooter({ text: `Slug: ${slug} • Token: ${token_id}` })
                    .setColor(44774)

                await interaction.editReply({ content: ' ­', embeds: [embedRank], components: [row] });

                let currQueries = (db.get(`${interaction.user.id}.assetquery`) != null ? db.get(`${interaction.user.id}.assetquery`) : {});
                currQueries[interaction.id] = [embedRank, embedSales, embedTraits, Date.now()];
                db.set(`${interaction.user.id}.assetquery`, currQueries)

                const message = await interaction.fetchReply();

                const filter = (btn) => {
                    return btn.user.id === interaction.user.id && btn.message.id == message.id;
                }

                const collector = interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 1000 * 90
                })

                collector.on('collect', async (button) => {

                    let queries = db.get(`${interaction.user.id}.assetquery`);
                    if (!queries || !queries[interaction.id]) {
                        return button.deferUpdate();
                    }
                    let rankEmbed = queries[interaction.id][0]
                    let salesEmbed = queries[interaction.id][1];
                    let traitsEmbed = queries[interaction.id][2];

                    if (button.customId == 'asset_traits') {
                        const row = new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setCustomId('asset_sales')
                                .setLabel('Show Sales')
                                .setStyle('SUCCESS')
                            ).addComponents(new MessageButton()
                                .setCustomId('asset_rank')
                                .setLabel('Show Rank')
                                .setStyle('PRIMARY')
                            );
                        await interaction.editReply({ embeds: [traitsEmbed], components: [row] });
                    } else if (button.customId == 'asset_sales') {
                        const row = new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setCustomId('asset_traits')
                                .setLabel('Show Traits')
                                .setStyle('SUCCESS')
                            ).addComponents(new MessageButton()
                                .setCustomId('asset_rank')
                                .setLabel('Show Rank')
                                .setStyle('PRIMARY')
                            );
                        await interaction.editReply({ embeds: [salesEmbed], components: [row] });
                    } else if (button.customId == 'asset_rank') {
                        const row = new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setCustomId('asset_sales')
                                .setLabel('Show Sales')
                                .setStyle('SUCCESS')
                            ).addComponents(new MessageButton()
                                .setCustomId('asset_traits')
                                .setLabel('Show Traits')
                                .setStyle('PRIMARY')
                            );
                        await interaction.editReply({ embeds: [rankEmbed], components: [row] });
                    }
                    button.deferUpdate();
                })

            } catch (err) {
                console.log(err);
                return interaction.editReply({ content: `Error parsing asset. Please try again.`, ephemeral: true });
            }

        }).catch((res) => {
            return interaction.reply({ content: res.reason, ephemeral: true });
        });

    },
}