const Discord = require("discord.js");
const axios = require('axios');
const botconfig = require('../botconfig.json');
const guildSchema = require('../schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#595ks1ol33d7wpk');
const request = require('request');
const { collection } = require("../schemas/guild-schema");

/**
 * Function for retrieving a collection's asset by token id. Requires an API Key
 * See more here: https://docs.opensea.io/reference/getting-assets
 */

exports.getAsset = async (client, collection_slug, token_id) => {

    return new Promise((resolve, reject) => {

        if (!client.OS_KEY) return reject({ status: 404, reason: 'No OS API Key found.' });
        if (!collection_slug) return reject({ status: 404, reason: 'No collection slug given.' });
        if (!token_id) return reject({ status: 404, reason: 'No token id given.' });

        // Find contract address from collection slug to pass into asset retrieve call
        sdk['retrieving-a-single-collection']({ collection_slug: collection_slug })
            .then(async (res) => {

                let collection_contract = res.collection.primary_asset_contracts[0].address;

                const c = res.collection;
                const totalSupply = c.stats.total_supply;
                let allTraits = res.collection.traits;
                // console.log(allTraits)
                if (!allTraits || allTraits.length == 0) return reject('Could not find traits for given collection. Please try again in a moment.')

                // Calc avg number of traits per category. Used for rarity score normalization
                var sum = 0;
                var categories = {}
                for (const category in allTraits) {
                    let traits = allTraits[category];
                    sum += Object.keys(traits).length;

                    let category_sum = 0;
                    Object.keys(traits).forEach((t) => {
                        category_sum += traits[t]
                    })
                    categories[category.toLowerCase()] = category_sum;
                }
                const avgPerCat = sum / Object.keys(allTraits).length;
                console.log(categories)

                // Calc trait rarity per category
                var trait_rarity = {};
                for (const category in allTraits) {
                    trait_rarity[category.toLowerCase()] = {};
                    let traits = allTraits[category];
                    Object.keys(traits).forEach((t) => {
                        let freq = traits[t] / totalSupply;
                        let rarity = 1 / freq;
                        let rarity_norm = rarity * (avgPerCat / Object.keys(traits).length);
                        let rarity_avg = (rarity + rarity_norm) / 2;
                        trait_rarity[category.toLowerCase()][t] = { rarity: rarity, rarity_norm: rarity_norm, rarity_avg: rarity_avg };
                    })
                    trait_rarity[category.toLowerCase()]['none'] = { rarity: 0, rarity_norm: 0 }
                    // Include rarity scores for if the NFT does not have the trait category. (4-T or 5-T rares)
                    // If all NFTs have the trait category 'none' will default to 0 for rarity score calc below
                    if (totalSupply != categories[category.toLowerCase()]) {
                        let none_freq = (totalSupply - categories[category.toLowerCase()]) / totalSupply;
                        let none_rarity = 1 / none_freq;
                        let none_rarity_norm = none_rarity * (avgPerCat / Object.keys(traits).length);
                        let none_rarity_avg = (none_rarity + none_rarity_norm) / 2
                        trait_rarity[category.toLowerCase()]['none'] = { rarity: none_rarity, rarity_norm: none_rarity_norm, rarity_avg: none_rarity_avg }
                    } else {
                        trait_rarity[category.toLowerCase()]['none'] = { rarity: 0, rarity_norm: 0, rarity_avg: 0 }
                    }
                }
                // console.log(trait_rarity)

                if (!collection_contract) return reject({ status: 400, reason: 'Error finding collection contract.' });

                // Make asset call. Requires API Key!
                sdk['retrieving-a-single-asset']({
                    'X-API-KEY': client.OS_KEY,
                    include_orders: 'false',
                    asset_contract_address: collection_contract,
                    token_id: token_id
                })
                    .then(async (res) => {
                        const asset_traits = res.traits;
                        var num_traits_freq = {};
                        var none_categories = Object.keys(categories);

                        // console.log(asset_traits)
                        var rarity_score = 0;
                        var rarity_score_norm = 0;
                        var rarity_score_avg = 0;
                        // Sum up rarity scores based on asset's traits
                        for (var i = 0; i < asset_traits.length; i++) {
                            let t = asset_traits[i];
                            none_categories = none_categories.filter(c => c !== t.trait_type.toLowerCase());
                            rarity_score += trait_rarity[t.trait_type.toLowerCase()][t.value.toLowerCase()].rarity;
                            rarity_score_norm += trait_rarity[t.trait_type.toLowerCase()][t.value.toLowerCase()].rarity_norm;
                            rarity_score_avg += trait_rarity[t.trait_type.toLowerCase()][t.value.toLowerCase()].rarity_avg;
                        }
                        // Account for rarity in not having specific traits
                        for (var j = 0; j < none_categories.length; j++) {
                            console.log(trait_rarity[none_categories[j]])
                            rarity_score += trait_rarity[none_categories[j]]['none'].rarity;
                            rarity_score_norm += trait_rarity[none_categories[j]]['none'].rarity_norm;
                            rarity_score_avg += trait_rarity[none_categories[j]]['none'].rarity_avg;
                            console.log(`None for ${none_categories[j]}: +${trait_rarity[none_categories[j]]['none'].rarity}, +${trait_rarity[none_categories[j]]['none'].rarity_norm}, +${trait_rarity[none_categories[j]]['none'].rarity_avg}`)
                        }
                        num_traits_freq[asset_traits.length] += 1;

                        client.OS_QUEUE_PRIO++;
                        while (client.OS_QUEUE >= 4) {
                            await client.delay(500);
                        }
                        client.OS_QUEUE++;
                        // Get current listings for asset
                        request(`https://api.opensea.io/api/v1/asset/${collection_contract}/${token_id}/listings`, {
                            method: "GET",
                            headers: {
                                'X-API-KEY': botconfig.OS_API_KEY
                            }
                        }, function (error, response, body) {
                            if (!error && response.statusCode == 200) {

                                const listingsJSON = JSON.parse(body).listings;

                                // Get current bids sorted by highest first
                                // Uses order endpoint. See more here: https://docs.opensea.io/reference/retrieving-orders
                                request(`https://api.opensea.io/api/v1/asset/${collection_contract}/${token_id}/offers`, {
                                    method: "GET",
                                    headers: {
                                        'X-API-KEY': botconfig.OS_API_KEY
                                    }
                                }, function (error, response, body) {
                                    if (!error && response.statusCode == 200) {

                                        const bidsJSON = JSON.parse(body);
                                        let bids = bidsJSON.offers;
                                        bids.sort((a, b) => ((Number(a.current_price) * Number(a.payment_token_contract.usd_price)) < (Number(b.current_price) * Number(b.payment_token_contract.usd_price))) ? 1 : -1);

                                        // Get sales history sorted by highest first
                                        // Uses event endpoint. See more here: https://docs.opensea.io/reference/retrieving-asset-events
                                        request(`https://api.opensea.io/api/v1/events?asset_contract_address=${collection_contract}&token_id=${token_id}&event_type=successful`, {
                                            method: "GET",
                                            headers: {
                                                'X-API-KEY': botconfig.OS_API_KEY
                                            }
                                        }, function (error, response, body) {
                                            if (!error && response.statusCode == 200) {

                                                const salesJSON = JSON.parse(body);
                                                let salesHistory = salesJSON.asset_events;
                                                salesHistory.sort((a, b) => ((Number(a.total_price) * Number(a.payment_token.usd_price)) < (Number(b.total_price) * Number(b.payment_token.usd_price))) ? 1 : -1);

                                                client.OS_QUEUE--;
                                                client.OS_QUEUE_PRIO--;
                                                resolve({ status: 200, assetObject: res, listings: listingsJSON, bids: bids, sales: salesHistory }); // Complete payload
                                            } else {
                                                client.OS_QUEUE--;
                                                client.OS_QUEUE_PRIO--;
                                                console.log('error', error, response && response.statusCode);
                                                resolve({ status: 200, assetObject: res, listings: listingsJSON, bids: bids, sales: [] });
                                            }
                                        });
                                    } else {
                                        client.OS_QUEUE--;
                                        client.OS_QUEUE_PRIO--;
                                        console.log('error', error, response && response.statusCode);
                                        resolve({ status: 200, assetObject: res, listings: listingsJSON, bids: [], sales: [] });
                                    }
                                });

                            } else {
                                client.OS_QUEUE--;
                                client.OS_QUEUE_PRIO--;
                                console.log('error', error, response && response.statusCode);
                                resolve({ status: 200, assetObject: res, listings: [], bids: [], sales: [] });
                            }
                        });

                    })
                    .catch(err => {
                        client.OS_QUEUE--;
                        client.OS_QUEUE_PRIO--;
                        console.error(err);
                        reject({ status: 400, reason: 'Error fetching asset. Double check token id.' });
                    });

            }).catch(err => {
                console.log(err);
                reject({ status: 404, reason: 'No collection found with that slug.' });
            });
    })
}