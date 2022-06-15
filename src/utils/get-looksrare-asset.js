const Discord = require("discord.js");
const axios = require("axios");
const botconfig = require("../botconfig.json");
const guildSchema = require("../schemas/guild-schema");
const util = require("util");
const request = require("request");
const promiseRequest = util.promisify(request);
const sdk = require("@looksrare/sdk");
const { collection } = require("../schemas/guild-schema");

/**
 * Function for retrieving an asset's listing/offer/sales from the LooksRare marketplace.
 * Public API Docs here: https://docs.looksrare.org/developers/public-api-documentation
 */

exports.getLooksRareAsset = async (client, collection_address, token_id) => {
  return new Promise(async (resolve, reject) => {
    if (!client.OS_KEY) return reject({ status: 404, reason: "No OS API Key found." });
    if (!collection_address) return reject({ status: 404, reason: "No collection address given." });
    if (!token_id) return reject({ status: 404, reason: "No token id given." });

    var currListing = {};
    var currOffer = {};
    var salesHistory = {};

    try {
      const askReq = await axios.get(`https://api.looksrare.org/api/v1/orders?isOrderAsk=true&collection=${collection_address}&tokenId=${token_id}&status%5B%5D=VALID&sort=NEWEST`);
      let parsed = askReq.data;
      if (parsed.success) {
        let data = parsed.data;
        if (!data.length || data[0].status != "VALID") {
          currListing["is_listed"] = false;
        } else {
          currListing["is_listed"] = true;
          currListing["price"] = data[0].price;
        }
      }

      const bidReq = await axios.get(`https://api.looksrare.org/api/v1/orders?isOrderAsk=false&collection=${collection_address}&tokenId=${token_id}&status%5B%5D=VALID&sort=PRICE_DESC`);
      parsed = bidReq.data;
      if (parsed.success) {
        let data = parsed.data;
        if (!data.length) {
          currOffer["has_offer"] = false;
        } else {
          currOffer["has_offer"] = true;
          currOffer["price"] = data[0].price;
        }
      } else {
        currOffer["has_offer"] = false;
      }

      const salesReq = await axios.get(`https://api.looksrare.org/api/v1/events?collection=${collection_address}&tokenId=${token_id}&type=SALE&pagination%5Bfirst%5D=150`);
      parsed = salesReq.data;
      if (parsed.success) {
        let data = parsed.data;
        if (!data.length) {
          salesHistory["has_sales"] = false;
        } else {
          salesHistory["has_sales"] = true;
          salesHistory["all_sales"] = data;
          salesHistory["last_sale"] = data[0].order;

          let highestSoFar = Number.NEGATIVE_INFINITY;
          for (var i = 0; i < data.length; i++) {
            if (Number(data[i].order.price) > highestSoFar) {
              highestSoFar = data[i].order.price;
              salesHistory["highest_sale"] = data[i];
            }
          }
        }
      } else {
        salesHistory["has_sales"] = false;
      }

      return resolve({ status: 200, listed: currListing, offer: currOffer, sales: salesHistory });
    } catch (err) {
      console.log(err.message);
      return;
    }
  });
};
