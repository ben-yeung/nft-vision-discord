const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#bg4ikl1mk428b');

var desc = ''

async function buildDesc(client, collects) {
    for (let i = 0; i < collects.length; i++) {
        let c = collects[i];
        let res = await sdk['retrieving-a-single-collection']({ collection_slug: c.slug });

        let stats = res.collection.stats;
        let currFloor = stats.floor_price;
        let oneDayVol = Number((stats.one_day_volume).toFixed(0));
        let oneDaySales = Number(stats.one_day_sales.toLocaleString("en-US"));
        let royalty = (Number(res.collection.dev_seller_fee_basis_points) + Number(res.collection.opensea_seller_fee_basis_points)) / 10000;
        let afterFees = currFloor - (royalty * currFloor);

        let name = res.collection.name;
        let openSea = 'https://opensea.io/collection/' + res.collection.slug;

        desc += `\n\n*${name}* • [OpenSea](${openSea}) \n **Floor Price:** ${currFloor}Ξ (~$${client.convertETH(currFloor).toLocaleString("en-US")}) **After Fees:** ${afterFees}Ξ (~$${client.convertETH(afterFees).toLocaleString("en-US")}) \n **24H Volume:** ${oneDayVol.toLocaleString("en-US")}Ξ (~$${client.convertETH(oneDayVol).toLocaleString("en-US")}) **24H Sales:** ${oneDaySales}`
    }
}

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

            // If guild is in mongoDB, check collections and accumulate summary
            // Else continue
            if (guildRes) {
                let collects = guildRes.collections;

                buildDesc(client, collects).then(() => {

                    if (desc == '') desc = 'OpenSea API rate limited. Please try again later.'

                    let embed = new Discord.MessageEmbed()
                        .setTitle('Summary')
                        .setDescription(desc)
                        .setColor(44774)

                    return interaction.reply({ embeds: [embed] })
                })

            }

        } catch (err) {
            console.log(err);
            return interaction.reply('Something went wrong. Try again in a moment.')
        }

    },
}