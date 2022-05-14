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
    if (!client.OS_KEY) return { status: 404, reason: 'No OS API Key found.' };
    if (!collection_slug) return { status: 404, reason: 'No collection slug given.' };
    if (!token_id) return { status: 404, reason: 'No token id given.' };

    let collection_contract = '';

    // Find contract address from collection slug to pass into asset retrieve call
    sdk['retrieving-a-single-collection']({ collection_slug: collection_slug })
        .then(async (res) => {

        }).catch(err => {
            console.log(err);
            return { status: 404, reason: 'No collection found with that slug.' }
        });;

    sdk['retrieving-a-single-asset']({
        include_orders: 'false',
        asset_contract_address: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
        token_id: '1'
    })
        .then(res => console.log(res))
        .catch(err => console.error(err));

}