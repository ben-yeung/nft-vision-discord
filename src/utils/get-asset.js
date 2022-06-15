const Discord = require("discord.js");
const axios = require("axios");
const botconfig = require("../botconfig.json");
const guildSchema = require("../schemas/guild-schema");
const request = require("request");
const { collection } = require("../schemas/guild-schema");
const sdk = require("api")("@opensea/v1.0#595ks1ol33d7wpk");
const { getOpenSeaAsset } = require("./get-os-asset");
const { getLooksRareAsset } = require("./get-looksrare-asset");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function sortPrice(a, b) {
  if (a.price < b.price) {
    return -1;
  } else {
    return 1;
  }
}

/**
 * Function for retrieving an asset's listing/offer/sales across supported marketplaces.
 * This function is utilized by commands such as /asset, /rank, etc and serves as a wrapper function
 * The goal is to return the asset object, listings, offers, and sales
 * Currently supports: OpenSea, LooksRare
 */

exports.getAsset = async (client, collection_slug, token_id) => {
  return new Promise((resolve, reject) => {
    if (!client.OS_KEY) return reject({ status: 404, reason: "No OS API Key found." });
    if (!collection_slug) return reject({ status: 404, reason: "No collection slug given." });
    if (!token_id) return reject({ status: 404, reason: "No token id given." });

    // Find contract address from collection slug to pass into asset retrieve call
    sdk["retrieving-a-single-collection"]({ collection_slug: collection_slug }).then(async (res) => {
      let collection_asset = res.collection.primary_asset_contracts[0];
      if (!collection_asset) return reject({ status: 400, reason: "Could not find collection contract. Assets not on Ethereum are currently not supported." });
      const collection_contract = collection_asset.address;

      // Get OpenSea asset
      getOpenSeaAsset(client, collection_contract, token_id)
        .then(async (openAsset) => {
          const asset = openAsset.assetObject;
          const looksAsset = await getLooksRareAsset(client, collection_contract, token_id).catch((err) => console.log(err));

          // Parse listings
          var allListings = [];
          if (openAsset.listings && openAsset.listings.length > 0) {
            let listings = openAsset.listings;
            let price = Number((listings[0].current_price / Math.pow(10, 18)).toFixed(4));
            allListings.push({
              name: "OpenSea",
              price: price,
              usd: currency.format(Number(price) * Number(listings[0].payment_token_contract.usd_price)),
              symbol: listings[0].payment_token_contract.symbol,
            });
          }
          if (looksAsset.status != 404 && looksAsset.listed.is_listed) {
            let price = Number((Number(looksAsset.listed.price) / Math.pow(10, 18)).toFixed(4));
            allListings.push({
              name: "LooksRare",
              price: price,
              usd: currency.format(Number(price) * Number(client.eth[0])),
              symbol: "WETH",
            });
          }

          allListings.sort((a, b) => {
            return b.price - a.price;
          });

          // Parse offers
          var allOffers = [];
          if (openAsset.offers && openAsset.offers.length > 0) {
            let offers = openAsset.offers;
            for (var i = 0; i < offers.length; i++) {
              let price = Number((offers[i].current_price / Math.pow(10, 18)).toFixed(4));
              allOffers.push({
                name: "OpenSea",
                price: price,
                usd: Number(price) * Number(offers[i].payment_token_contract.usd_price),
                symbol: offers[i].payment_token_contract.symbol,
              });
            }
          }
          if (looksAsset.offer && looksAsset.offer.has_offer) {
            let price = Number((Number(looksAsset.offer.price) / Math.pow(10, 18)).toFixed(4));
            allOffers.push({
              name: "LooksRare",
              price: price,
              usd: Number(price) * Number(client.eth[0]),
              symbol: "WETH",
            });
          }
          allOffers.sort((a, b) => {
            return b.usd - a.usd;
          });

          // Parse sales history
          var allSales = [];
          if (openAsset.sales && openAsset.sales.length > 0) {
            let sales = openAsset.sales;
            for (var i = 0; i < sales.length; i++) {
              let price = Number((sales[i].total_price / Math.pow(10, 18)).toFixed(4));
              allSales.push({
                name: "OpenSea",
                price: price,
                usd: currency.format(price * Number(sales[i].payment_token.usd_price)),
                symbol: sales[i].payment_token.symbol,
              });
            }
          }
          if (looksAsset.sales && looksAsset.sales.has_sales) {
            let sales = looksAsset.sales.all_sales;
            for (var i = 0; i < sales.length; i++) {
              let price = Number((Number(sales[i].order.price) / Math.pow(10, 18)).toFixed(4));
              allSales.push({
                name: "LooksRare",
                price: price,
                usd: currency.format(price * Number(client.eth[0])),
                symbol: "WETH",
              });
            }
          }

          allSales.sort((a, b) => {
            return b.price - a.price;
          });

          // Parse last sales
          var lastSale = "None";
          var lastSaleDate = Number.NEGATIVE_INFINITY;
          if (openAsset.assetObject.last_sale) {
            var date = new Date(openAsset.assetObject.last_sale.event_timestamp);
            var milliseconds = Math.floor(date.getTime() / 1000);
            if (milliseconds > lastSaleDate) {
              let price = openAsset.assetObject.last_sale.total_price / Math.pow(10, 18);
              lastSale = {
                name: "OpenSea",
                price: price,
                usd: currency.format(Number(price) * Number(openAsset.assetObject.last_sale.payment_token.usd_price)),
                symbol: openAsset.assetObject.last_sale.payment_token.symbol,
                date: milliseconds,
              };
              lastSaleDate = milliseconds;
            }
          }
          if (looksAsset.sales && looksAsset.sales.has_sales) {
            let timestamp = looksAsset.sales.last_sale.endTime;
            if (timestamp > lastSaleDate) {
              let price = Number(looksAsset.sales.last_sale.price) / Math.pow(10, 18);
              lastSale = {
                name: "LooksRare",
                price: price,
                usd: currency.format(Number(price) * Number(client.eth[0])),
                symbol: "WETH",
                date: timestamp,
              };
              lastSaleDate = timestamp;
            }
          }

          return resolve({ status: 200, assetObject: asset, listings: allListings, offers: allOffers, sales: allSales, last_sale: lastSale });
        })
        .catch((err) => {
          // Commands utilize OS API for asset images, traits, etc
          // One pivot could be utilizing a tokenURI smart contract call to curate asset details manually
          // For now we use OS API as the backbone for asset details with LooksRare + other marketplaces as listings/offers/sales comparisons
          console.log(err);
          return reject({ status: 404, reason: err.message });
        });
    });
  });
};
