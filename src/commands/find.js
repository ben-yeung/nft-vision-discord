const Discord = require("discord.js");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#bg4ikl1mk428b');
const db = require('quick.db');
const ms = require('ms');

/*
    quick.db is used for command spam prevention
    quick.db is not a long term db solution in this context
    mongoDB is used for per guild collection storing long term
    while quick.db is for Discord command related tracking
*/
function pruneQueries(author) {
    let queries = db.get(`${author.id}.findquery`)
    if (!queries) return

    for (const [key, val] of Object.entries(queries)) {
        if (Date.now() - val[2] >= 120000) {
            delete queries[key]
        }
    }
    db.set(`${author.id}.findquery`, queries)
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('find')
        .setDescription('Retrieve information for a given collection. View stats, royalties, fp, etc')
        .addStringOption(option => option.setName('collection-slug').setDescription('OpenSea Collection slug. Commmonly found in the URL of the collection.').setRequired(true)),
    options: '[collection-slug]',
    async execute(interaction, args, client) {

        if (db.get(`${interaction.user.id}.findstarted`) && Date.now() - db.get(`${interaction.user.id}.findstarted`) <= 15000) {
            return interaction.reply(`Please close your most recent find command or wait ${ms(15000 - (Date.now() - db.get(`${interaction.user.id}.findstarted`)))} before starting another query!`)
        } else {
            db.set(`${interaction.user.id}.findstarted`, Date.now())
            pruneQueries(interaction.user);
        }

        sdk['retrieving-a-single-collection']({ collection_slug: interaction.options.getString('collection-slug'), 'X-API-KEY': client.OS_KEY })
            .then(async (res) => {

                let stats = res.collection.stats;
                let currFloor = Number(stats.floor_price.toFixed(4));
                let totalSupply = stats.total_supply;
                let numOwners = stats.num_owners;
                let totalVol = Number((stats.total_volume).toFixed(0));
                let totalSales = Number(stats.total_sales).toLocaleString("en-US");
                let oneDayVol = Number((stats.one_day_volume).toFixed(0));
                let oneDayAvg = Number((stats.one_day_average_price).toFixed(4));
                let oneDaySales = Number(stats.one_day_sales.toLocaleString("en-US"));
                let sevenDayVol = Number((stats.seven_day_volume).toFixed(0));
                let sevenDayAvg = Number((stats.seven_day_average_price).toFixed(4));
                let sevenDaySales = Number(stats.seven_day_sales).toLocaleString("en-US");

                let thirtyDayVol = Number((stats.thirty_day_volume).toFixed(0));
                let thirtyDayAvg = Number((stats.thirty_day_average_price).toFixed(4));
                let thirtyDaySales = Number(stats.thirty_day_sales).toLocaleString("en-US");
                let royalty = (Number(res.collection.dev_seller_fee_basis_points) + Number(res.collection.opensea_seller_fee_basis_points)) / 100;

                let name = res.collection.name;
                let imageThumb = res.collection.image_url;
                let discordURL = res.collection.discord_url;
                let website = res.collection.external_url;
                let twitterUser = res.collection.twitter_username;
                let openSea = 'https://opensea.io/collection/' + res.collection.slug;
                let socials = '';

                let detailedDesc = `**Floor Price:** ${currFloor}Ξ (~$${client.convertETH(currFloor).toLocaleString("en-US")}) 
                                    \n **Total Volume:** ${totalVol.toLocaleString("en-US")}Ξ (~$${client.convertETH(totalVol).toLocaleString("en-US")}) 
                                     **Total Sales:** ${totalSales} 
                                    \n **24H Volume:** ${oneDayVol.toLocaleString("en-US")}Ξ (~$${client.convertETH(oneDayVol).toLocaleString("en-US")}) 
                                     **24H Floor Avg:** ${oneDayAvg.toLocaleString("en-US")}Ξ (~$${client.convertETH(oneDayAvg).toLocaleString("en-US")}) 
                                     **24H Sales:** ${oneDaySales} 
                                    \n **7 Day Volume:** ${sevenDayVol.toLocaleString("en-US")}Ξ (~$${client.convertETH(sevenDayVol).toLocaleString("en-US")}) 
                                     **7 Day Floor Avg:** ${sevenDayAvg.toLocaleString("en-US")}Ξ (~$${client.convertETH(sevenDayAvg).toLocaleString("en-US")}) 
                                     **7 Day Sales:** ${sevenDaySales} 
                                    \n **30 Day Volume:** ${thirtyDayVol.toLocaleString("en-US")}Ξ (~$${client.convertETH(thirtyDayVol).toLocaleString("en-US")}) 
                                    **30 Day Floor Avg:** ${thirtyDayAvg.toLocaleString("en-US")}Ξ (~$${client.convertETH(thirtyDayAvg).toLocaleString("en-US")}) 
                                    **30 Day Sales:** ${thirtyDaySales} 
                                    \n [OpenSea](${openSea})`


                let desc = `**Floor Price:** ${currFloor}Ξ (~$${client.convertETH(currFloor).toLocaleString("en-US")}) 
                            \n **Total Volume:** ${totalVol.toLocaleString("en-US")}Ξ (~$${client.convertETH(totalVol).toLocaleString("en-US")}) 
                            **Total Sales:** ${totalSales} 
                            \n **24H Volume:** ${oneDayVol.toLocaleString("en-US")}Ξ (~$${client.convertETH(oneDayVol).toLocaleString("en-US")}) 
                            **24H Floor Avg:** ${oneDayAvg.toLocaleString("en-US")}Ξ (~$${client.convertETH(oneDayAvg).toLocaleString("en-US")}) 
                            **24H Sales:** ${oneDaySales} 
                            \n [OpenSea](${openSea})`

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
                        text: `Royalties: ${royalty}% | Total Supply: ${totalSupply} | Owners: ${numOwners}`
                    });

                let findEmbedDetailed = new MessageEmbed()
                    .setTitle(`${name}`)
                    .setDescription(detailedDesc)
                    .setThumbnail(imageThumb)
                    .setColor(44774)
                    .setFooter({
                        text: `Royalties: ${royalty}% | Total Supply: ${totalSupply} | Owners: ${numOwners}`
                    });

                const row = new MessageActionRow()
                    .addComponents(new MessageButton()
                        .setCustomId('find_details')
                        .setLabel('More Details')
                        .setStyle('PRIMARY')
                    ).addComponents(new MessageButton()
                        .setCustomId('find_close')
                        .setLabel('Close')
                        .setStyle('DANGER')
                    );

                await interaction.reply({ embeds: [findEmbedSimple], components: [row] });


                let currQueries = (db.get(`${interaction.user.id}.findquery`) != null ? db.get(`${interaction.user.id}.findquery`) : {});
                currQueries[interaction.id] = [findEmbedSimple, findEmbedDetailed, Date.now()]
                db.set(`${interaction.user.id}.findquery`, currQueries)

                const message = await interaction.fetchReply();

                const filter = (btn) => {
                    return btn.user.id === interaction.user.id && btn.message.id == message.id;
                }

                const collector = interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 1000 * 60
                })

                collector.on('collect', async (button) => {

                    let queries = db.get(`${interaction.user.id}.findquery`);
                    if (!queries || !queries[interaction.id]) {
                        return button.deferUpdate();
                    }
                    let simple = queries[interaction.id][0];
                    let detailed = queries[interaction.id][1];

                    if (button.customId == 'find_details') {
                        const row = new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setCustomId('find_hide')
                                .setLabel('Hide Details')
                                .setStyle('PRIMARY')
                            ).addComponents(new MessageButton()
                                .setCustomId('find_close')
                                .setLabel('Close')
                                .setStyle('DANGER')
                            );
                        await interaction.editReply({ embeds: [detailed], components: [row] });
                    } else if (button.customId == 'find_hide') {
                        const row = new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setCustomId('find_details')
                                .setLabel('Show Details')
                                .setStyle('PRIMARY')
                            ).addComponents(new MessageButton()
                                .setCustomId('find_close')
                                .setLabel('Close')
                                .setStyle('DANGER')
                            );
                        await interaction.editReply({ embeds: [simple], components: [row] });
                    } else if (button.customId == 'find_close') {
                        db.delete(`${interaction.user.id}.findstarted`)
                        delete queries[interaction.id]
                        db.set(`${interaction.user.id}.findquery`, queries)
                        await interaction.deleteReply();
                    }
                    button.deferUpdate();
                })

            })
            .catch(err => {
                console.log(err);
                return interaction.reply('Error while searching for collection. Check for typos or try again.')
            });


    },
}