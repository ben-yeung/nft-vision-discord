const Discord = require("discord.js");
const axios = require('axios');
const botconfig = require('../botconfig.json');
const guildSchema = require('../schemas/guild-schema');
const sdk = require('api')('@opensea/v1.0#595ks1ol33d7wpk');

/**
 * Function to parse an asset's traits and form it into a readable String
 */

exports.parseTraits = async (client, traits) => {

    return new Promise((resolve, reject) => {

        if (!traits) reject({ status: 404, reason: 'No traits given.' })

        let traitDesc = '';
        traits.sort((a, b) => (a.trait_count > b.trait_count) ? 1 : -1);

        for (var i = 0; i < traits.length; i++) {
            traitDesc += `**${traits[i].trait_type}:** ${traits[i].value} • (1/${traits[i].trait_count}) \n\n`;
        }

        resolve(traitDesc);
    })
}