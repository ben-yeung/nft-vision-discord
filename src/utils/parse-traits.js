const Discord = require("discord.js");
const axios = require("axios");
const botconfig = require("../botconfig.json");
const guildSchema = require("../schemas/guild-schema");
const sdk = require("api")("@opensea/v1.0#595ks1ol33d7wpk");

/**
 * Function to parse an asset's traits and form it into a readable String
 */

exports.parseTraits = async (client, traits, trait_map) => {
  return new Promise((resolve, reject) => {
    if (!traits) return reject({ status: 404, reason: "No traits given." });
    if (traits == "Unrevealed") return resolve(traits);

    let traitDesc = "";
    traits.sort((a, b) => (a.trait_count > b.trait_count ? 1 : -1));

    if (trait_map) {
      for (var i = 0; i < traits.length; i++) {
        if (trait_map[traits[i].value]) {
          traitDesc += `**${traits[i].trait_type}:** ${traits[i].value} • (1/${traits[i].trait_count}) • +${trait_map[
            traits[i].value
          ][0].toFixed(2)} \n\n`;
        }
      }
      let none_traits = Object.keys(trait_map.OtherList);
      for (var j = 0; j < none_traits.length; j++) {
        if (trait_map.OtherList[none_traits[j]]) {
          traitDesc += `${none_traits[j]} • (1/${trait_map.OtherList[none_traits[j]][1]}) • +${trait_map.OtherList[
            none_traits[j]
          ][0].toFixed(2)} \n\n`;
        }
      }
    } else {
      for (var i = 0; i < traits.length; i++) {
        traitDesc += `**${traits[i].trait_type}:** ${traits[i].value} • (1/${traits[i].trait_count}) \n\n`;
      }
    }

    resolve(traitDesc);
  });
};
