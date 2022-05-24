const Discord = require("discord.js")
const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#bg4ikl1mk428b');


async function buildDesc(client, collects) {
    let desc = '';
    for (let i = 0; i < collects.length; i++) {
        let c = collects[i];

        try {
            let res = await sdk['retrieving-a-single-collection']({ collection_slug: c.slug, 'X-API-KEY': client.OS_KEY });

            let stats = res.collection.stats;
            let currFloor = Number(stats.floor_price.toFixed(4));
            let oneDayVol = Number((stats.one_day_volume).toFixed(0));
            let oneDaySales = Number(stats.one_day_sales.toLocaleString("en-US"));
            let royalty = (Number(res.collection.dev_seller_fee_basis_points) + Number(res.collection.opensea_seller_fee_basis_points)) / 10000;
            let afterFees = Number((currFloor - (royalty * currFloor)).toFixed(4));

            let name = res.collection.name;
            let openSea = 'https://opensea.io/collection/' + c.slug;

            desc += `\n\n*${name}* • [OpenSea](${openSea}) \n **Floor Price:** ${currFloor}Ξ (~$${client.convertETH(currFloor).toLocaleString("en-US")}) **After Fees:** ${afterFees}Ξ (~$${client.convertETH(afterFees).toLocaleString("en-US")}) \n **24H Volume:** ${oneDayVol.toLocaleString("en-US")}Ξ (~$${client.convertETH(oneDayVol).toLocaleString("en-US")}) **24H Sales:** ${oneDaySales}`
        } catch (err) {
            console.log(err);
        }

    }
    return desc;
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
                await interaction.reply({ content: 'Checking collections...', embeds: [] })
                let collects = guildRes.collections;

                let desc = await buildDesc(client, collects);

                if (desc == '') desc = 'OpenSea API rate limited or collection not found. Please check slugs for typos or try again.'

                let embed = new Discord.MessageEmbed()
                    .setTitle('Summary')
                    .setDescription(desc)
                    .setColor(44774)
                    .setTimestamp()

                await interaction.editReply({ content: ' ­', embeds: [embed] });
            } else {
                return interaction.reply({ content: 'Error occurred. Please try again in a moment.', ephemeral: true })
            }

        } catch (err) {
            console.log(err);
            return interaction.reply({ content: 'Error occurred. Please try again in a moment.', ephemeral: true })
        }


    },
}