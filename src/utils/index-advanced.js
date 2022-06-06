const Discord = require("discord.js");
const botconfig = require("../botconfig.json");
const guildSchema = require("../schemas/guild-schema");
const metaSchema = require("../schemas/metadata-schema");
const sdk = require("api")("@opensea/v1.0#595ks1ol33d7wpk");
const request = require("request");
const async = require("async");

var Web3 = require("web3");
const { default: axios } = require("axios");
var web3 = new Web3(new Web3.providers.HttpProvider(botconfig.LIGHT_NODE)); // insert provider http here
const ether_key = botconfig.ETHERSCAN_API_KEY;

/**
 * Function to calculate the rarity scores / rankings for a collection.
 * Utilizes Etherscan API and more specifically the tokenURI function of a standard ERC-721 smart contract to index.
 *
 * For the web3 provider I recommend using a private eth node. Otherwise you will need to likely pay for premium plans with alchemy / infura
 * This of course depends on your usage/traffic but with collections being upwards of 10k+ in size the calls add up!
 */

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

exports.indexAdvanced = async (client, collection_slug) => {
  return new Promise((resolve, reject) => {
    if (client.OS_INDEX_QUEUE.indexOf(collection_slug) != -1) return reject("Collection is already queued for indexing. Please check back in a moment.");

    sdk["retrieving-a-single-collection"]({ collection_slug: collection_slug })
      .then(async (res) => {
        let collection_contract = res.collection.primary_asset_contracts[0].address;
        const totalSupply = res.collection.stats.total_supply;
        var token_ids = [...Array(totalSupply).keys()];

        if (!collection_contract)
          return reject({
            status: 400,
            reason: "Error finding collection contract.",
          });
        const endpoint = "https://api.etherscan.io/api?module=contract&action=getabi&address=" + collection_contract + "&apikey=" + ether_key;
        request(endpoint, async function (error, response, body) {
          try {
            var json = JSON.parse(body);
            if (json.message === "NOTOK") {
              console.log("ERROR: " + json.result);
              return;
            }
            contractAbiJSON = JSON.parse(json.result);

            var contract = new web3.eth.Contract(contractAbiJSON, collection_contract);

            var categories = {};
            var tokens = {};
            var leftover = [];

            client.OS_INDEX_QUEUE.push(collection_slug);
            console.log(`Beginning to index ${collection_slug}`);

            async.eachLimit(
              token_ids,
              100,
              async function (token_id, callback) {
                await contract.methods["tokenURI"](token_id)
                  .call()
                  .then(async (tokenURI) => {
                    let res = await axios.get(tokenURI);
                    var traits = [];
                    for (var i = 0; i < res.data.attributes.length; i++) {
                      let category = res.data.attributes[i].trait_type;
                      let value = res.data.attributes[i].value;
                      let payload = {
                        trait_type: category,
                        value: value,
                      };
                      traits.push(payload);

                      if (!categories[category]) {
                        categories[category] = {};
                        categories[category]["count"] = 0;
                        categories[category]["traits"] = {};
                      }
                      categories[category]["traits"][value] = categories[category]["traits"][value] ? categories[category]["traits"][value] + 1 : 1;
                      categories[category]["count"] += 1;
                    }
                    tokens[token_id] = traits;
                    if (token_id % 50 == 0) {
                      console.log(`[${collection_slug}]: ${token_id}`);
                    }
                  })
                  .catch((err) => {
                    // console.log(err);
                    leftover.push(token_id);
                  });
              },
              async function () {
                var stuck = [];
                // Catch any leftovers
                console.log(`[${collection_slug}]: Cleaning up leftovers (${leftover.length})`);
                while (leftover.length > 0) {
                  var token_id = leftover.pop();
                  await contract.methods["tokenURI"](token_id)
                    .call()
                    .then(async (tokenURI) => {
                      let res = await axios.get(tokenURI);
                      var traits = [];
                      for (var i = 0; i < res.data.attributes.length; i++) {
                        let category = res.data.attributes[i].trait_type;
                        let value = res.data.attributes[i].value;
                        let payload = {
                          trait_type: category,
                          value: value,
                        };
                        traits.push(payload);

                        if (!categories[category]) {
                          categories[category] = {};
                          categories[category]["count"] = 0;
                          categories[category]["traits"] = {};
                        }
                        categories[category]["traits"][value] = categories[category]["traits"][value] ? categories[category]["traits"][value] + 1 : 1;
                        categories[category]["count"] += 1;
                      }
                      tokens[token_id] = traits;
                    })
                    .catch((err) => {
                      console.log(err);
                      // Retry one more time
                      // Else just skip for now (Prevent deadlock)
                      if (!stuck.includes(token_id)) {
                        leftover.unshift(token_id);
                      }
                      stuck.push(token_id);
                    });
                }

                try {
                  // Begin to calc rarity scores
                  var sumTraits = 0;
                  const cats = Object.keys(categories);
                  for (var i = 0; i < cats.length; i++) {
                    let cat = categories[cats[i]];
                    let traits = Object.keys(cat["traits"]);
                    let count = cat["count"];
                    sumTraits += traits.length;

                    // Account for "None" as a trait in this category
                    if (totalSupply - count > 0) {
                      sumTraits += 1;
                    }
                  }

                  const avgPerCat = sumTraits / cats.length;

                  // Calc rarity scores for individual traits
                  var trait_rarity = {};
                  for (var i = 0; i < cats.length; i++) {
                    let cat = categories[cats[i]];
                    trait_rarity[cats[i]] = {};
                    let traits = cat["traits"];
                    const trait_total = totalSupply - cat["count"] >= 1 ? Object.keys(traits).length + 1 : Object.keys(traits).length;
                    Object.keys(traits).forEach((t) => {
                      let freq = traits[t] / totalSupply;
                      let rarity = 1 / freq;
                      let rarity_norm = rarity * (avgPerCat / trait_total);
                      trait_rarity[cats[i]][t] = {
                        rarity: rarity,
                        rarity_norm: rarity_norm,
                        count: trait_total,
                      };
                    });
                    // Include rarity scores for if the NFT does not have the trait category. (4-T or 5-T rares)
                    // If all NFTs have the trait category 'none' will default to 0 for rarity score calc below
                    if (totalSupply - cat["count"] >= 1) {
                      let none_freq = (totalSupply - cat["count"]) / totalSupply;
                      let none_rarity = 1 / none_freq;
                      let none_rarity_norm = none_rarity * (avgPerCat / trait_total);
                      trait_rarity[cats[i]]["none"] = {
                        rarity: none_rarity,
                        rarity_norm: none_rarity_norm,
                        count: totalSupply - cat["count"],
                      };
                    }
                  }
                  var num_traits_freq = {};
                  var allTokensArr = [];

                  // Assign rarity scores per NFT asset as the sum of trait rarity scores
                  let allTokens = Object.keys(tokens);
                  for (var i = 0; i < allTokens.length; i++) {
                    let token_id = allTokens[i];
                    let traits = tokens[token_id];

                    if (traits.length > 0) {
                      const asset_traits = traits;
                      var none_categories = Object.keys(categories);
                      var trait_map = {};

                      var rarity_score = 0;
                      var rarity_score_norm = 0;
                      // Sum up rarity scores based on asset's traits
                      for (var j = 0; j < asset_traits.length; j++) {
                        const t = asset_traits[j];
                        none_categories = none_categories.filter((c) => c !== t.trait_type);

                        rarity_score += trait_rarity[t.trait_type][t.value].rarity;
                        rarity_score_norm += trait_rarity[t.trait_type][t.value].rarity_norm;
                        trait_map[t.value] = [trait_rarity[t.trait_type][t.value].rarity_norm, t.trait_type];
                      }
                      // Account for rarity in not having specific traits
                      var none_list = {};

                      for (var k = 0; k < none_categories.length; k++) {
                        rarity_score += trait_rarity[none_categories[k]]["none"].rarity;
                        rarity_score_norm += trait_rarity[none_categories[k]]["none"].rarity_norm;
                        // Used in parse-traits.js when formatting traits and trait rarity scores into embed
                        none_list[`**${none_categories[k][0].toUpperCase() + none_categories[k].substring(1)}:** None`] = [
                          trait_rarity[none_categories[k]]["none"].rarity_norm,
                          trait_rarity[none_categories[k]]["none"].count,
                        ];
                      }
                      trait_map[`OtherList`] = none_list;
                      if (!num_traits_freq[asset_traits.length]) num_traits_freq[asset_traits.length] = 0;
                      num_traits_freq[asset_traits.length] += 1;

                      let asset_rarity = {
                        token_id: token_id,
                        trait_count: asset_traits.length,
                        trait_map: trait_map,
                        rarity_score: rarity_score,
                        rarity_score_norm: rarity_score_norm,
                      };
                      allTokensArr.push(asset_rarity);
                    }
                  }

                  if (allTokensArr.length == 0) return reject("Error parsing collection's traits. Please try again later");

                  // Account for trait count weights and construct rankings
                  try {
                    var trait_count_rarities = {};
                    const trait_count_avg = (sumTraits + Object.keys(num_traits_freq).length) / (Object.keys(categories).length + 1);

                    const trait_counts = Object.keys(num_traits_freq);
                    for (var i = 0; i < trait_counts.length; i++) {
                      let count_freq = num_traits_freq[trait_counts[i]] / totalSupply;
                      let count_rarity = 1 / count_freq;
                      let count_normed = count_rarity * (trait_count_avg / Object.keys(num_traits_freq).length);
                      trait_count_rarities[trait_counts[i]] = [count_normed, num_traits_freq[trait_counts[i]]];
                    }

                    // Copy allTokensArr and introduce Trait Count weighting
                    var allTokensTraitCount = JSON.parse(JSON.stringify(allTokensArr));
                    for (var j = 0; j < allTokensTraitCount.length; j++) {
                      let trait_score = trait_count_rarities[allTokensTraitCount[j].trait_count][0];
                      let trait_total = trait_count_rarities[allTokensTraitCount[j].trait_count][1];
                      allTokensTraitCount[j].rarity_score += trait_score;
                      allTokensTraitCount[j].rarity_score_norm += trait_score;

                      // We make a deep copy of allTokensArr for allTokensTraitCount to separate sorting
                      // However we combine the rankings into a single ranking object so we want to keep trait_map updated for point purposes
                      allTokensArr[j].trait_map["OtherList"][`**Trait Count:** ${allTokensArr[j].trait_count}`] = [trait_score, trait_total];
                    }

                    allTokensArr.sort((a, b) => {
                      return b["rarity_score_norm"] - a["rarity_score_norm"];
                    });
                    allTokensTraitCount.sort((a, b) => {
                      return b["rarity_score_norm"] - a["rarity_score_norm"];
                    });

                    var rankings = {};

                    // Create object with token_id as key to make lookup faster. Store the rankings in mongoDB
                    for (var i = 0; i < allTokensArr.length; i++) {
                      var rank = i + 1;
                      if (i > 0) {
                        if (allTokensArr[i - 1]["rarity_score_norm"] == allTokensArr[i]["rarity_score_norm"]) {
                          rank = allTokensArr[i - 1]["rank_norm"];
                        }
                      }
                      allTokensArr[i]["rank_norm"] = rank;
                      rankings[allTokensArr[i].token_id] = allTokensArr[i];
                    }

                    for (var j = 0; j < allTokensTraitCount.length; j++) {
                      var rank = j + 1;
                      if (j > 0) {
                        let prev = allTokensTraitCount[j - 1].token_id;
                        if (allTokensTraitCount[j - 1].rarity_score_norm == allTokensTraitCount[j].rarity_score_norm) {
                          rank = rankings[prev]["rank_trait_count"];
                        }
                      }
                      let token_id = allTokensTraitCount[j].token_id;
                      rankings[token_id]["rarity_score_trait"] = allTokensTraitCount[j].rarity_score_norm;
                      rankings[token_id]["rank_trait_count"] = rank;
                    }

                    // Save to mongoDB and create new entry if needed
                    const res = await metaSchema.findOne({
                      slug: collection_slug,
                    });

                    if (!res) {
                      console.log(`[${collection_slug}]: Newly indexed collection. Creating schema`);
                      const rankOBJ = {
                        slug: collection_slug,
                        ranks: rankings,
                      };
                      await new metaSchema(rankOBJ).save();
                    } else {
                      console.log(`[${collection_slug}]: Updating existing collection ranks.`);
                      try {
                        await metaSchema.updateOne({ slug: collection_slug }, { ranks: rankings });
                        if (res == null) return interaction.reply("An error occurred. Please try again.");
                      } catch (err) {
                        reject("An error occurred while indexing. Please try again.");
                      }
                    }
                  } catch (err) {
                    console.log(err);
                    reject("Something went wrong while indexing. Please try again in a moment.");
                  }

                  client.OS_INDEX_QUEUE = client.OS_INDEX_QUEUE.filter((value) => value != collection_slug);
                  console.log(`[${collection_slug}]: Finished indexing`);
                  resolve("Finished");
                } catch (err) {
                  console.log(err);
                }
              }
            );
          } catch (err) {
            console.log(err);
            reject("Error while searching for contract. Please try again in a moment.");
          }
        });
      })
      .catch((err) => {
        console.log(err);
        reject("Error searching for collection. OS may be down or collection does not exist. Please try again in a moment.");
      });
  });
};
