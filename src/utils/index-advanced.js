const Discord = require("discord.js");
const botconfig = require("../botconfig.json");
const guildSchema = require("../schemas/guild-schema");
const metaSchema = require("../schemas/metadata-schema");
const sdk = require("api")("@opensea/v1.0#595ks1ol33d7wpk");
const request = require("request");
const async = require("async");

var Web3 = require("web3");
const { default: axios } = require("axios");
var web3 = new Web3(new Web3.providers.HttpProvider(botconfig.INFURA_PROVIDER));
const ether_key = botconfig.ETHERSCAN_API_KEY;

/**
 * Function to calculate the rarity scores for a collection.
 * Utilizes Etherscan API and more specifically the tokenURI function of a standard ERC-721 smart contract
 * to build trait metadata for a collection.
 */

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

exports.indexAdvanced = async (client, collection_slug) => {
  if (client.OS_INDEX_QUEUE.indexOf(collection_slug) != -1)
    return reject(
      "Collection is already queued for indexing. Please check back in a moment."
    );

  return new Promise((resolve, reject) => {
    var allTokensArr = [];

    sdk["retrieving-a-single-collection"]({ collection_slug: collection_slug })
      .then(async (res) => {
        let collection_contract =
          res.collection.primary_asset_contracts[0].address;
        const total_supply = res.collection.stats.total_supply;
        var token_ids = [...Array(total_supply).keys()];

        if (!collection_contract)
          return reject({
            status: 400,
            reason: "Error finding collection contract.",
          });
        const endpoint =
          "https://api.etherscan.io/api?module=contract&action=getabi&address=" +
          collection_contract +
          "&apikey=" +
          ether_key;
        request(endpoint, async function (error, response, body) {
          try {
            var json = JSON.parse(body);
            if (json.message === "NOTOK") {
              console.log("ERROR: " + json.result);
              return;
            }
            contractAbiJSON = JSON.parse(json.result);

            var contract = new web3.eth.Contract(
              contractAbiJSON,
              collection_contract
            );

            var categories = {};

            let res = await axios.get(
              `https://api.nftport.xyz/v0/nfts/${collection_contract}`,
              {
                headers: {
                  Authorization: botconfig.NFTPORT_API_KEY,
                  "Content-Type": "application/json",
                },
                params: {
                  chain: "ethereum",
                  page_number: 1,
                },
              }
            );
            console.log(res);

            // async.eachLimit(
            //   token_ids,
            //   50,
            //   async function (token_id, callback) {
            //     await contract.methods["tokenURI"](token_id)
            //       .call()
            //       .then(async (tokenURI) => {
            //         let res = await axios.get(tokenURI);
            //         for (var i = 0; i < res.data.attributes.length; i++) {
            //           let category = res.data.attributes[i].trait_type;
            //           let value = res.data.attributes[i].value;
            //           if (!categories[category]) categories[category] = {};
            //           categories[category][value] = categories[category][value]
            //             ? categories[category][value] + 1
            //             : 1;
            //         }
            //         allTokensArr.push(res.data);
            //         console.log(token_id);
            //       })
            //       .catch((err) => {
            //         console.log(err);
            //         console.log("Error calling tokenURI func");
            //       });
            //   },
            //   function (err) {
            //     // done with all ajax calls
            //     console.log(categories);
            //   }
            // );

            //     var c = 0;
            //     while (c < total_supply) {
            //       if (c % 10 == 0) {
            //         console.log(`[${collection_slug}]: ${c}`);
            //       }
            //       await contract.methods["tokenURI"](c)
            //         .call()
            //         .then(async (data) => {
            //           request(data, function (error, response, body) {
            //             c += 1;
            //           });
            //         })
            //         .catch((err) => {
            //           c += 1;
            //           console.log(err);
            //           console.log("Error calling tokenURI func");
            //         });
            //     }
          } catch (err) {
            console.log(err);
            reject(
              "Error while searching for contract. Please try again in a moment."
            );
          }
        });
      })
      .catch((err) => {
        console.log(err);
        reject(
          "Error searching for collection. OS may be down or collection does not exist. Please try again in a moment."
        );
      });
  });
};
