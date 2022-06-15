const Discord = require("discord.js");
const axios = require("axios");
const botconfig = require("../botconfig.json");
const guildSchema = require("../schemas/guild-schema");
const sdk = require("api")("@opensea/v1.0#595ks1ol33d7wpk");
const request = require("request");
const { collection } = require("../schemas/guild-schema");

/**
 * Function for retrieving a collection's asset by token id. Requires an API Key
 * See more here: https://docs.opensea.io/reference/getting-assets
 */

exports.getOpenSeaAsset = async (client, collection_contract, token_id) => {
  return new Promise((resolve, reject) => {
    if (!client.OS_KEY) return reject({ status: 404, reason: "No OS API Key found." });
    if (!collection_contract) return reject({ status: 404, reason: "No collection contract given." });
    if (!token_id) return reject({ status: 404, reason: "No token id given." });
    // Make OpenSea asset call. Requires API Key!
    sdk["retrieving-a-single-asset"]({
      "X-API-KEY": client.OS_KEY,
      include_orders: "false",
      asset_contract_address: collection_contract,
      token_id: token_id,
    })
      .then(async (res) => {
        client.OS_QUEUE_PRIO++;
        while (client.OS_QUEUE >= 4) {
          await client.delay(500);
        }
        client.OS_QUEUE++;
        // Get current listings for asset
        request(
          `https://api.opensea.io/api/v1/asset/${collection_contract}/${token_id}/listings`,
          {
            method: "GET",
            headers: {
              "X-API-KEY": botconfig.OS_API_KEY,
            },
          },
          function (error, response, body) {
            if (!error && response.statusCode == 200) {
              const listingsJSON = JSON.parse(body).listings;

              // Get current bids sorted by highest first
              // Uses offers endpoint. See more here: https://docs.opensea.io/reference/asset-offers
              request(
                `https://api.opensea.io/api/v1/asset/${collection_contract}/${token_id}/offers?limit=50`,
                {
                  method: "GET",
                  headers: {
                    "X-API-KEY": botconfig.OS_API_KEY,
                  },
                },
                function (error, response, body) {
                  if (!error && response.statusCode == 200) {
                    const bidsJSON = JSON.parse(body);
                    let bids = bidsJSON.offers;

                    // Get sales history sorted by highest first
                    // Uses event endpoint. See more here: https://docs.opensea.io/reference/retrieving-asset-events
                    request(
                      `https://api.opensea.io/api/v1/events?asset_contract_address=${collection_contract}&token_id=${token_id}&event_type=successful`,
                      {
                        method: "GET",
                        headers: {
                          "X-API-KEY": botconfig.OS_API_KEY,
                        },
                      },
                      function (error, response, body) {
                        client.OS_QUEUE--;
                        client.OS_QUEUE_PRIO--;
                        if (!error && response.statusCode == 200) {
                          const salesJSON = JSON.parse(body);
                          let salesHistory = salesJSON.asset_events;
                          salesHistory.sort((a, b) => (Number(a.total_price) * Number(a.payment_token.usd_price) < Number(b.total_price) * Number(b.payment_token.usd_price) ? 1 : -1));

                          resolve({ status: 200, assetObject: res, listings: listingsJSON, offers: bids, sales: salesHistory }); // Complete payload
                        } else {
                          console.log("error", error, response && response.statusCode);
                          resolve({ status: 200, assetObject: res, listings: listingsJSON, offers: bids, sales: [] });
                        }
                      }
                    );
                  } else {
                    client.OS_QUEUE--;
                    client.OS_QUEUE_PRIO--;
                    console.log("error", error, response && response.statusCode);
                    resolve({ status: 200, assetObject: res, listings: listingsJSON, offers: [], sales: [] });
                  }
                }
              );
            } else {
              client.OS_QUEUE--;
              client.OS_QUEUE_PRIO--;
              console.log("error", error, response && response.statusCode);
              resolve({ status: 200, assetObject: res, listings: [], offers: [], sales: [] });
            }
          }
        );
      })
      .catch((err) => {
        client.OS_QUEUE--;
        client.OS_QUEUE_PRIO--;
        console.error(err);
        reject({ status: 400, reason: "Error fetching asset. Double check token id." });
      });
  });
};
