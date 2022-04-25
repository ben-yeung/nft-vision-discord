const Discord = require("discord.js");
const botconfig = require('./botconfig.json');
const guildSchema = require('./schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#bg4ikl1mk428b');

/**
 * Function for monitoring collections and sending alert embeds when targets are met.
 * Alert embeds are sent to the alerts channel set by the guild. If empty, monitor is ignored.
 * FLoor is monitored via OpenSea API which is rate limited without an API Key.
 * See more here: https://docs.opensea.io/reference/retrieving-a-single-collection
 * 
 * This function is used in index.js with timeout intervals.
 * The /monitor command will send an embed regardless of targets to display current floor.
 * Automatic interval check only sends embed when a target is met.
 */

exports.monitor = async (client) => {
    const Guilds = client.guilds.cache;

    Guilds.forEach(async function (guild, index) {
        try {
            let guildRes = await guildSchema.findOne({
                guild_id: guild.id
            });

            // If guild is in mongoDB, check collections
            // Else continue
            if (guildRes) {
                const alertChannel = guild.channels.cache.get(guildRes.alerts_channel);
                let collects = guildRes.collections;
                for (let i = 0; i < collects.length; i++) {
                    let c = collects[i];
                    console.log(`[Guild ${guild.id}]: Checking collection ${c.slug}`);
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

                            let checkAbove = Boolean(c.check_above);

                            let alert = (checkAbove ? `**Target:** Above ${c.target}Ξ` : `**Target:** Below ${c.target}Ξ`)
                            let desc = `${alert} \n\n [OpenSea](${openSea})`
                            if (discordURL) desc += ` • [Discord](${discordURL})`;
                            if (website) desc += ` • [Website](${website})`;
                            if (twitterUser) desc += ` • [Twitter](https://twitter.com/${twitterUser})`;

                            let alertEmbed = new Discord.MessageEmbed()
                                .setTitle(`${name} reached ${currFloor}Ξ Floor`)
                                .setDescription(desc)
                                .setThumbnail(imageThumb)
                                .setColor(44774)
                                .setFooter({
                                    text: `Royalties: ${royalty}% | Total Supply: ${totalSupply} | Owners: ${numOwners}`
                                })

                            if (alertChannel) {
                                if (checkAbove && currFloor > c.target && currFloor != c.last_check) {
                                    alertChannel.send({ embeds: [alertEmbed] })
                                } else if (!checkAbove && currFloor < c.target && currFloor != c.last_check) {
                                    alertChannel.send({ embeds: [alertEmbed] })
                                }
                                guildRes.collections[i].last_check = currFloor;
                                const saveRes = await guildSchema.findOneAndUpdate({ guild_id: guild.id }, { collections: guildRes.collections })
                                if (saveRes == null) console.log('Error occurred saving to mongoDB');
                            }

                        })
                        .catch(err => console.error(err));
                }
            }

        } catch (err) {
            console.log(err);
        }
    })
}