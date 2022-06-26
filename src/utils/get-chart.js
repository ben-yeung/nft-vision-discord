const Discord = require("discord.js");
const { MessageAttachment } = require("discord.js");
const axios = require("axios");
const botconfig = require("../botconfig.json");
const guildSchema = require("../schemas/guild-schema");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const request = require("request");
const ms = require("ms");

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Function for retrieving ETH's current price in USD. Used to translate ETH prices in embeds.
 * This function utilizes CoinGecko's API for getting ETH's USD conversion. The free plan is limited by 50 calls per minute
 * See more here: https://www.coingecko.com/en/api/documentation
 */

exports.getChart = async (client, collection) => {
  return new Promise(async (resolve, reject) => {
    try {
      let collection_asset = collection.primary_asset_contracts[0];
      if (!collection_asset)
        return reject({
          status: 400,
          reason: "Could not find collection contract. Assets not on Ethereum are currently not supported.",
        });
      const collection_contract = collection_asset.address;

      const width = 600;
      const height = 350;

      var cursor = "";
      // Format for datapoints of a scatter chartjs is {x: val, y: val}
      var dataPoints = [];

      do {
        try {
          while (client.OS_QUEUE >= 4) {
            await delay(2500);
          }
          client.OS_QUEUE++;
          // Call OS Endpoint to get orders between given timeframe
          // Uses https://docs.opensea.io/reference/retrieving-asset-events
          let res = await axios.get(
            `https://api.opensea.io/api/v1/events?asset_contract_address=${collection_contract}&event_type=successful&limit=50&cursor=${cursor}`,
            {
              headers: {
                "X-API-KEY": botconfig.OS_API_KEY,
              },
            }
          );
          client.OS_QUEUE--;
          if (res.data) {
            let events = res.data.asset_events;
            for (var i = 0; i < events.length; i++) {
              // console.log(events[i]);
              let price = Number((events[i].total_price / Math.pow(10, 18)).toFixed(4));
              let date = new Date(events[i].event_timestamp);
              let timeSince = Date.now() + date.getTimezoneOffset() * 60000 - date.getTime();
              timeSince = timeSince / (3.6 * Math.pow(10, 6));
              dataPoints.push({ x: timeSince, y: price });
            }
            cursor = res.data.next;
          } else {
            break;
          }
        } catch (err) {
          client.OS_QUEUE--;
          console.log(err);
          break;
        }
      } while (cursor && cursor != "" && dataPoints.length < 2500);

      var filteredDataPoints = [];

      // Calc mean, std dev, and z-score to factor out outliers
      var sum = 0;
      for (var j = 0; j < dataPoints.length; j++) {
        sum += dataPoints[j].y;
      }
      const mean = sum / dataPoints.length;
      var stdSum = 0;

      for (var k = 0; k < dataPoints.length; k++) {
        stdSum += Math.pow(dataPoints[k].y - mean, 2);
      }
      const std = Math.sqrt(stdSum / dataPoints.length);

      for (var l = 0; l < dataPoints.length; l++) {
        let zScore = (dataPoints[l].y - mean) / std;
        if (zScore < 2 && zScore > -2) {
          filteredDataPoints.push(dataPoints[l]);
        }
      }

      const data = {
        datasets: [
          {
            label: "Sales (ETH)",
            data: dataPoints,
            backgroundColor: "rgba(32, 129, 226, 0.5)",
            fill: false,
          },
        ],
      };

      const filteredData = {
        datasets: [
          {
            label: "Sales (ETH)",
            data: filteredDataPoints,
            backgroundColor: "rgba(32, 129, 226, 0.5)",
            fill: false,
          },
        ],
      };

      let scale = Math.floor(dataPoints[dataPoints.length - 1].x * 1.05);
      let f_scale = Math.floor(filteredDataPoints[filteredDataPoints.length - 1].x * 1.05);

      const config = {
        type: "scatter",
        data: data,
        options: {
          scales: {
            x: {
              reverse: true,
              max: scale,
            },
          },
        },
      };

      const filteredConfig = {
        type: "scatter",
        data: filteredData,
        options: {
          scales: {
            x: {
              reverse: true,
              max: f_scale,
            },
          },
        },
      };

      const canvas = new ChartJSNodeCanvas({ width, height, backgroundColour: "white" });
      const image = await canvas.renderToBuffer(config);
      const image2 = await canvas.renderToBuffer(filteredConfig);

      resolve({ status: 200, chart: [image, image2], numPoints: dataPoints.length });
    } catch (err) {
      console.log(err);
      reject({ status: 400, reason: "Error generating chart." });
    }
  });
};
