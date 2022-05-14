const Discord = require("discord.js");
const axios = require('axios');
const botconfig = require('../botconfig.json');
const guildSchema = require('../schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#595ks1ol33d7wpk');

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
                    .then(res => {
                        resolve({ status: 200, assetObject: res });
                    })
                    .catch(err => {
                        console.error(err);
                        reject({ status: 400, reason: 'Error fetching asset. Double check token id.' });
                    });

            }).catch(err => {
                console.log(err);
                reject({ status: 404, reason: 'No collection found with that slug.' });
            });;
    })
}