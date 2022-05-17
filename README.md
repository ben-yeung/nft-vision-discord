# OS-discord-bot

[![Discord.js](https://img.shields.io/badge/discord.js-v13-blue?style=for-the-badge&logo=discord)](https://www.npmjs.com/package/discord.js)
   [![npm](https://img.shields.io/badge/npm-v8.5.2-red?style=for-the-badge&logo=npm)](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
   [![Node.js](https://img.shields.io/badge/Node.js-v16.14.2-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org/en/)
   ![WIP](https://img.shields.io/badge/Status-WIP-red?style=for-the-badge)

## 🤖 A Discord bot specialized in monitoring OpenSea NFT Collections.

Discord bot to monitor/query OpenSea collections for floor prices, owner ratio, royalties, etc... Commands allow for setting target floor prices, receiving custom alerts, and accessing important external links to the collection's Twitter, Discord, and website. Support for multi-guild monitoring via mongoDB.

## 🎙️ Commands
* **/add [collection-slug] \[target-price] [Above?]**
  *  Add a collection to the monitor list.
  *  Specify a target floor price (in ETH) and whether to check above or below (True or False)
  *  The "Above?" parameter allows for users to monitor sell targets or buy in targets.
* **/remove [collection-slug]**
  *  Remove a collection from the monitor list.
* **/derisk [collection-slug] \[amount]**
  * Assess your risk and derisk as necessary with ease.
  * The amount specified is the price you spent / want to spend.
  * The command returns the price to list at in order to break even and calculates current floor price profit margins.
* **/find [collection-slug]**
  * Retrieve a summary of a collection.
  * Returns an embed containing total supply, owner count, royalties (OS royalty included), total volume, and floor price.
* **/asset [collection-slug] [token-id]**
  * Retrieve a specific asset from a collection.
  * View the NFT's traits, last sold, current listing, highest bid, highest sale, and current owner.
* **/eth [amount]**
  * Get current ETH to USD conversion with an option for custom amounts.
  * CoinGecko API see the "Debugging" section for more details.
* **/summary**
  * View a comprehensive summary of the currently monitored collections.
  * The amount of ETH after royalties is calculated given the current collection's floor price to quickly review costs/profits.
* **/getlist**
  * View the list of monitored collections as well as the current target prices set for each respective collection.
* TBA ...

## 📸 Command Previews
Previews are stored on imgur. [Visit imgur](https://imgur.com/a/ZXg0FPc)

## 📅 Future Updates / Roadmap Ahead
- [x] Integrate Discord.js buttons to make UX simpler.
- [x] Add 7 day and 30 day statistics to find command. 
- [x] Asset retrieval with trait assessment and sales history statistics.
- [x] Implement asset processing with RR scheduling to prevent API Rate Limits.
- [ ] NFT Rarity ranking and query options.
- [ ] Support for transaction hashes/ids to pull an NFT's collection, purchase price (mint or secondary), and calculate the current risk.
- [ ] Wallet watching commands for when notable wallets buy/sell monitored collections.
- [ ] Publish a web dApp to serve as an all-in-one NFT tool with above utilities.

## 🧰 Debugging / Notes
* "collection-slug" refers to the unique identifier associated with the collection. Often found at the end of the collection link: https://opensea.io/collection/azuki => azuki
* This project utilizes mongoDB to support multi-guild functionality. See more here [mongoDB Docs](https://www.mongodb.com/docs/mongodb-vscode/connect/)
* Discord bot is built using discord.js v13 with a focus on slash command utility. See more here [discord.js Guide](https://discordjs.guide/interactions/slash-commands.html#registering-slash-commands)
* For production deployment see the file src/deploy.js for more information on how to register slash commands.
* Due note that using the OpenSea API can become rate limited without an API Key. See more here on requesting a free key [OpenSea Docs](https://docs.opensea.io/reference/request-an-api-key)
* The eth and gas commands utilize Etherscan's API endpoint to fetch details. See more on getting a key here [Etherscan API Docs](https://docs.etherscan.io/)
* ETH conversion is dependent on CoinGecko's API. See more here [CoinGecko Docs](https://www.coingecko.com/en/api/documentation)

## 🛠 Dependencies Include:
* [mongoose](https://www.npmjs.com/package/mongoose)
* [@discordjs/builders](https://www.npmjs.com/package/@discordjs/builders)
* [@discordjs/rest](https://www.npmjs.com/package/@discordjs/rest)
* [discord-api-types](https://www.npmjs.com/package/discord-api-types)
* [discord.js](https://www.npmjs.com/package/discord.js)
* [api](https://www.npmjs.com/package/api)


