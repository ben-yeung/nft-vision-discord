const Discord = require("discord.js");
const axios = require('axios');
const botconfig = require('../botconfig.json');
const guildSchema = require('../schemas/guild-schema');
const metaSchema = require('../schemas/metadata-schema');
const asset = require("../commands/asset");
const sdk = require('api')('@opensea/v1.0#595ks1ol33d7wpk');

/**
 * Function to calculate the rarity scores for a collection.
 * Utilizes Etherscan API and more specifically the tokenURI function of a standard ERC-721 smart contract
 * to build trait metadata for a collection.
 */

function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

exports.indexAdvanced = async (client, collection_slug) => {
    if (client.OS_INDEX_QUEUE.indexOf(collection_slug) != -1) return reject('Collection is already queued for indexing. Please check back in a moment.');

    var allTokensArr = [];

    sdk['retrieving-a-single-collection']({ collection_slug: collection_slug })
        .then(async (res) => {

            let collection_contract = res.collection.primary_asset_contracts[0].address;

            if (!collection_contract) return reject({ status: 400, reason: 'Error finding collection contract.' });


        }).catch(err => {
            console.log(err);
            reject('Error searching for collection. OS may be down or collection does not exist. Please try again in a moment.')
        })
};