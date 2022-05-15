const Discord = require("discord.js");
const axios = require('axios');
const botconfig = require('../botconfig.json');
const guildSchema = require('../schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#595ks1ol33d7wpk');
const request = require('request');

/**
 * Function for retrieving a collection's asset by token id. Requires an API Key
 * See more here: https://docs.opensea.io/reference/getting-assets
 */

exports.getAsset = async (client, collection_slug, token_id) => {

    return new Promise((resolve, reject) => {

        if (!client.OS_KEY) reject({ status: 404, reason: 'No OS API Key found.' });
        if (!collection_slug) reject({ status: 404, reason: 'No collection slug given.' });
        if (!token_id) reject({ status: 404, reason: 'No token id given.' });

        // Find contract address from collection slug to pass into asset retrieve call
        sdk['retrieving-a-single-collection']({ collection_slug: collection_slug })
            .then(async (res) => {

                let collection_contract = res.collection.primary_asset_contracts[0].address;

                if (!collection_contract) reject({ status: 400, reason: 'Error finding collection contract.' });


                // Make asset call. Requires API Key!
                sdk['retrieving-a-single-asset']({
                    'X-API-KEY': client.OS_KEY,
                    include_orders: 'false',
                    asset_contract_address: collection_contract,
                    token_id: token_id
                })
                    .then(async (res) => {

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
                                                console.log(salesHistory)

                                                resolve({ status: 200, assetObject: res, listings: listingsJSON, bids: bids, sales: salesHistory }); // Complete payload
                                            } else {
                                                console.log('error', error, response && response.statusCode);
                                                resolve({ status: 200, assetObject: res, listings: listingsJSON, bids: bids, sales: [] });
                                            }
                                        });
                                    } else {
                                        console.log('error', error, response && response.statusCode);
                                        resolve({ status: 200, assetObject: res, listings: listingsJSON, bids: [], sales: [] });
                                    }
                                });

                            } else {
                                console.log('error', error, response && response.statusCode);
                                resolve({ status: 200, assetObject: res, listings: [], bids: [], sales: [] });
                            }
                        });

                    })
                    .catch(err => {
                        console.error(err);
                        reject({ status: 400, reason: 'Error fetching asset. Double check token id.' });
                    });

            }).catch(err => {
                console.log(err);
                reject({ status: 404, reason: 'No collection found with that slug.' });
            });
    })
}