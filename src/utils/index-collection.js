const Discord = require("discord.js");
const axios = require('axios');
const botconfig = require('../botconfig.json');
const guildSchema = require('../schemas/guild-schema');
const metaSchema = require('../schemas/metadata-schema');
const asset = require("../commands/asset");
const sdk = require('api')('@opensea/v1.0#595ks1ol33d7wpk');

/**
 * Function to calculate the rarity scores for a collection.
 * Plans to store in mongoDB for indexed collections to prevent rate limits calling OS API
 */

function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

exports.indexCollection = async (client, collection_slug) => {

    return new Promise((resolve, reject) => {

        if (client.OS_INDEX_QUEUE.indexOf(collection_slug) != -1) return reject('Collection is already queued for indexing. Please check back in a moment.');

        var allTokensArr = [];

        sdk['retrieving-a-single-collection']({ collection_slug: collection_slug })
            .then(async (res) => {

                const c = res.collection;
                const totalSupply = c.stats.total_supply;
                let allTraits = c.traits;
                if (!allTraits || Object.keys(allTraits).length == 0) return reject('Could not find traits for given collection. Metadata may not be revealed yet.')

                // Calc avg number of traits per category. Used for rarity score normalization
                var sum = 0;
                var categories = {}
                var num_traits_freq = {};
                for (const category in allTraits) {
                    let traits = allTraits[category];
                    sum += Object.keys(traits).length;

                    let category_sum = 0;
                    Object.keys(traits).forEach((t) => {
                        category_sum += traits[t]
                    })
                    categories[category] = category_sum;

                    if (Math.abs(category_sum - totalSupply) > 1) {
                        sum += 1;
                    };
                }
                const avgPerCat = sum / Object.keys(allTraits).length;
                const catSum = sum; // Used for trait count weighting when frequencies are found

                // console.log(allTraits)

                // Calc trait rarity per category
                var trait_rarity = {};
                for (const category in allTraits) {
                    trait_rarity[category] = {};
                    let traits = allTraits[category];
                    console.log(category)
                    console.log(traits)
                    const trait_total = (totalSupply - categories[category] >= 1 ? Object.keys(traits).length + 1 : Object.keys(traits).length);
                    Object.keys(traits).forEach((t) => {
                        let freq = traits[t] / totalSupply;
                        let rarity = 1 / freq;
                        let rarity_norm = rarity * (avgPerCat / trait_total);
                        trait_rarity[category][t] = { rarity: rarity, rarity_norm: rarity_norm };
                    })
                    // Include rarity scores for if the NFT does not have the trait category. (4-T or 5-T rares)
                    // If all NFTs have the trait category 'none' will default to 0 for rarity score calc below
                    if (totalSupply - categories[category] >= 1) {
                        let none_freq = (totalSupply - categories[category]) / totalSupply;
                        let none_rarity = 1 / none_freq;
                        let none_rarity_norm = none_rarity * (avgPerCat / trait_total);
                        trait_rarity[category]['none'] = { rarity: none_rarity, rarity_norm: none_rarity_norm, count: totalSupply - categories[category] }
                    } else {
                        trait_rarity[category]['none'] = { rarity: 0, rarity_norm: 0 }
                    }
                }
                console.log(trait_rarity)

                // Asset fetching in batches of 50 per call.
                var cursor = '';
                client.OS_INDEX_QUEUE.push(collection_slug);
                console.log(`Beginning to index ${collection_slug}`)
                while (allTokensArr.length < totalSupply) {
                    let error = false;
                    try {
                        while (client.OS_QUEUE_PRIO > 0 || client.OS_QUEUE >= 4 || (client.OS_INDEX_QUEUE.length > 0 && (collection_slug != client.OS_INDEX_QUEUE[0]) && collection_slug != client.OS_INDEX_QUEUE[1])) {
                            await delay(2500);
                        }
                        client.OS_QUEUE++;
                        let assetJSON = await sdk['getting-assets']({
                            collection_slug: collection_slug,
                            limit: '50',
                            include_orders: 'false',
                            cursor: cursor,
                            'X-API-KEY': botconfig.OS_API_KEY
                        }).catch(async (err) => {
                            error = true;
                        })
                        if (error) {
                            client.OS_QUEUE--;
                            console.log("Rate limit... Waiting")
                            await delay(Math.random() * 2000 + 500);
                            continue
                        }
                        client.OS_INDEX_CNT++;
                        // Attempt at Round Robin Scheduling (Modified to support two collections requesting per RR cycle)
                        if (client.OS_INDEX_CNT >= 20) {
                            let slug = client.OS_INDEX_QUEUE.shift();
                            client.OS_INDEX_QUEUE.push(slug);
                            client.OS_INDEX_CNT = 0;
                        }
                        client.OS_QUEUE--;
                        console.log(`[${collection_slug}]: ${allTokensArr.length}`)

                        assetJSON.assets.forEach(asset => {
                            let { token_id, traits } = asset;

                            const asset_traits = traits;
                            var none_categories = Object.keys(categories);
                            var trait_map = {}

                            var rarity_score = 0;
                            var rarity_score_norm = 0;
                            // Sum up rarity scores based on asset's traits
                            for (var i = 0; i < asset_traits.length; i++) {
                                const t = asset_traits[i];
                                try {
                                    none_categories = none_categories.filter(c => c !== t.trait_type);
                                    rarity_score += trait_rarity[t.trait_type][t.value.toLowerCase()].rarity;
                                    rarity_score_norm += trait_rarity[t.trait_type][t.value.toLowerCase()].rarity_norm;

                                    trait_map[t.value] = trait_rarity[t.trait_type][t.value.toLowerCase()].rarity_norm;
                                } catch (err) {
                                    console.log(t.trait_type)
                                    console.log(t.value)
                                    console.log(err);
                                }

                            }
                            // Account for rarity in not having specific traits
                            var none_list = {}
                            for (var j = 0; j < none_categories.length; j++) {
                                rarity_score += trait_rarity[none_categories[j]]['none'].rarity;
                                rarity_score_norm += trait_rarity[none_categories[j]]['none'].rarity_norm;
                                // Used in parse-traits.js when formatting traits and trait rarity scores into embed
                                none_list[`**${none_categories[j][0].toUpperCase() + none_categories[j].substring(1)}:** None`] = [trait_rarity[none_categories[j]]['none'].rarity_norm, trait_rarity[none_categories[j]]['none'].count];
                            }
                            trait_map[`Other`] = none_list;
                            if (!num_traits_freq[asset_traits.length]) num_traits_freq[asset_traits.length] = 0;
                            num_traits_freq[asset_traits.length] += 1;

                            let asset_rarity = {
                                token_id: token_id,
                                trait_count: asset_traits.length,
                                trait_map: trait_map,
                                rarity_score: rarity_score,
                                rarity_score_norm: rarity_score_norm
                            }
                            allTokensArr.push(asset_rarity);
                            // console.log(`Token ${token_id} : ${rarity_score}, ${rarity_score_norm}, ${rarity_score_avg} `);
                        });
                        cursor = assetJSON.next;
                    } catch (err) {
                        console.log(err);
                        await delay(1000);
                    }

                }

                // Account for trait count weights and construct rankings
                try {
                    var trait_count_rarities = {};
                    const trait_count_avg = (catSum + Object.keys(num_traits_freq).length) / (Object.keys(allTraits).length + 1);

                    const trait_counts = Object.keys(num_traits_freq)
                    for (var i = 0; i < trait_counts.length; i++) {
                        let count_freq = num_traits_freq[trait_counts[i]] / totalSupply;
                        let count_rarity = 1 / count_freq;
                        let count_normed = count_rarity * (trait_count_avg / (Object.keys(num_traits_freq).length));
                        trait_count_rarities[trait_counts[i]] = [count_normed, num_traits_freq[trait_counts[i]]];
                    }

                    // Copy allTokensArr and introduce Trait Count weighting
                    var allTokensTraitCount = JSON.parse(JSON.stringify(allTokensArr))
                    for (var j = 0; j < allTokensTraitCount.length; j++) {
                        let trait_score = trait_count_rarities[allTokensTraitCount[j].trait_count][0];
                        let trait_total = trait_count_rarities[allTokensTraitCount[j].trait_count][1];
                        allTokensTraitCount[j].rarity_score += trait_score;
                        allTokensTraitCount[j].rarity_score_norm += trait_score;

                        // We make a deep copy of allTokensArr for allTokensTraitCount to separate sorting
                        // However we combine the rankings into a single ranking object so we want to keep trait_map updated for point purposes
                        allTokensArr[j].trait_map['Other'][`**Trait Count:** ${allTokensArr[j].trait_count}`] = [trait_score, trait_total];
                    }

                    allTokensArr.sort((a, b) => {
                        return b['rarity_score_norm'] - a['rarity_score_norm'];
                    })
                    allTokensTraitCount.sort((a, b) => {
                        return b['rarity_score_norm'] - a['rarity_score_norm'];
                    })

                    var rankings = {};

                    // Create object with token_id as key to make lookup faster. Store the rankings in mongoDB
                    for (var i = 0; i < allTokensArr.length; i++) {
                        var rank = i + 1;
                        if (i > 0) {
                            if (allTokensArr[i - 1]['rarity_score_norm'] == allTokensArr[i]['rarity_score_norm']) {
                                rank = allTokensArr[i - 1]['rank_norm'];
                            }
                        }
                        allTokensArr[i]['rank_norm'] = rank;
                        rankings[allTokensArr[i].token_id] = allTokensArr[i];
                    }

                    for (var j = 0; j < allTokensTraitCount.length; j++) {
                        var rank = j + 1;
                        if (j > 0) {
                            let prev = allTokensTraitCount[j - 1].token_id
                            if (allTokensTraitCount[j - 1].rarity_score_norm == allTokensTraitCount[j].rarity_score_norm) {
                                rank = rankings[prev]['rank_trait_count'];
                            }
                        }
                        let token_id = allTokensTraitCount[j].token_id;
                        rankings[token_id]['rarity_score_trait'] = allTokensTraitCount[j].rarity_score_norm;
                        rankings[token_id]['rank_trait_count'] = rank;
                    }

                    // Save to mongoDB and create new entry if needed
                    const res = await metaSchema.findOne({
                        slug: collection_slug
                    });

                    if (!res) {
                        console.log(`[${collection_slug}]: Newly indexed collection. Creating schema`);
                        const rankOBJ = {
                            slug: collection_slug,
                            ranks: rankings
                        }
                        await new metaSchema(rankOBJ).save();
                    } else {
                        console.log(`[${collection_slug}]: Updating existing collection ranks.`)
                        try {
                            await metaSchema.updateOne({ slug: collection_slug }, { ranks: rankings })
                            if (res == null) return interaction.reply('An error occurred. Please try again.');
                        } catch (err) {
                            reject('An error occurred while indexing. Please try again.')
                        }
                    }
                } catch (err) {
                    console.log(err);
                    reject('Something went wrong while indexing. Please try again in a moment.')
                }

                client.OS_INDEX_QUEUE = client.OS_INDEX_QUEUE.filter((value) => value != collection_slug);
                console.log(`[${collection_slug}]: Finished indexing`);
                resolve('Finished');

            }).catch(err => {
                console.log(err);
                reject('Error while searching for collection. Check for typos or try again.');
            });
    })
}