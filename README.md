<img src="https://user-images.githubusercontent.com/51476377/175126545-69bec962-3866-4469-a090-e61cd6d30eda.png" width="128">

# nft-vision-discord

[![Discord.js](https://img.shields.io/badge/discord.js-v13-blue?style=for-the-badge&logo=discord)](https://www.npmjs.com/package/discord.js)
   [![npm](https://img.shields.io/badge/npm-v8.5.2-red?style=for-the-badge&logo=npm)](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
   [![Node.js](https://img.shields.io/badge/Node.js-v16.14.2-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org/en/)
   ![WIP](https://img.shields.io/badge/Status-WIP-red?style=for-the-badge)

## 🤖 A Discord bot specialized in monitoring OpenSea NFT Collections.

Discord bot to monitor/query OpenSea collections for floor prices, owner ratio, royalties, etc... Commands allow for setting target floor prices, receiving custom alerts, and accessing important external links to the collection's Twitter, Discord, and website. Support for multi-guild monitoring via mongoDB.

## 🎙️ Commands

- **/add [collection-slug] \[target-price] [Above?]**
  - Add a collection to the monitor list.
  - Specify a target floor price (in ETH) and whether to check above or below (True or False)
  - The "Above?" parameter allows for users to monitor sell targets or buy in targets.
- **/remove [collection-slug]**
  - Remove a collection from the monitor list.
- **/derisk [collection-slug] \[amount]**
  - Assess your risk and derisk as necessary with ease.
  - The amount specified is the price you spent / want to spend.
  - The command returns the price to list at in order to break even and calculates current floor price profit margins.
- **/find [collection-slug]**
  - Retrieve a summary of a collection.
  - Returns an embed containing total supply, owner count, royalties (OS royalty included), total volume, and floor price.
- **/asset [collection-slug] [token-id]**
  - Retrieve a specific asset from a collection.
  - View the NFT's traits, last sold, current listing, highest bid, highest sale, and current owner.
- **/rank [collection-slug] [token-id]**
  - Retrieve a specific asset's rank.
  - View the NFT's rank with Trait Normalization and with Trait Count Weighting.
- **/chart [collection-slug]**
  - Retrieve a chart of the recent sales (Capped at 2500 sales).
  - Returns an embed containing a chart, floor price summary, and rarity rank coloring if applicable.
- **/summary**
  - View a comprehensive summary of the currently monitored collections.
  - The amount of ETH after royalties is calculated given the current collection's floor price to quickly review costs/profits.
- TBA ...

## 📸 Command Previews

### [Link to Full Album](https://imgur.com/a/ZXg0FPc)

|                                                  Asset Overview                                                   |                                                            Rarity Rankings                                                             |
| :---------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------: |
| ![iM52QFu](https://user-images.githubusercontent.com/51476377/176044074-d3a7f166-87dd-498a-b64c-bb31ce6f06ba.png) | ![Screenshot 2022-06-27 150712](https://user-images.githubusercontent.com/51476377/176044260-7d29e213-d1c3-4171-a051-a79eb7a061f4.png) |

|                                                  Derisk Utility                                                   |                                              Floor Price Monitoring                                               |
| :---------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------: |
| ![IwL4BRq](https://user-images.githubusercontent.com/51476377/176044170-5e6c63b8-c601-4122-b319-83f96b6a4a0b.png) | ![x3LZvsV](https://user-images.githubusercontent.com/51476377/176044225-44ee52a6-bda7-4ae9-b048-492db7b7d1d0.png) |

|                                              Sales History Charting                                               |                                                       Trait Score Distributions                                                        |
| :---------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------: |
| ![Mmhf0pT](https://user-images.githubusercontent.com/51476377/176044109-69156b1d-2a31-4635-a1f9-c4a5b4bd9a42.png) | ![Screenshot 2022-06-27 150726](https://user-images.githubusercontent.com/51476377/176044275-968e513b-f3e8-46cb-a420-ca251e1be882.png) |

## 📅 Future Updates / Roadmap Ahead

- [x] Integrate Discord.js buttons to make UX simpler.
- [x] Add 7 day and 30 day statistics to find command.
- [x] Asset retrieval with trait assessment and sales history statistics.
- [x] Implement asset processing with RR scheduling to prevent API Rate Limits.
- [x] Setup a collection index queue to handle multiple index requests.
- [x] NFT Rarity ranking with trait normalization.
- [x] NFT Rarity ranking with trait count weighting.
- [x] Implement Etherscan API tokenURI to fetch collection metadata rather than pinging OpenSea endpoint.
- [x] Integrate LooksRare API to display listings, sales, bids within related commands.
- [x] Add Sales History charting with Rank Rarity coloring if indexed.
- [ ] Integrate X2Y2 API to display listings, sales, bids within related commands.
- [ ] Support for transaction hashes/ids to pull an NFT's collection, purchase price (mint or secondary), and calculate the current risk.
- [ ] Wallet watching commands for when notable wallets buy/sell monitored collections.
- [ ] Publish a web dApp to serve as an all-in-one NFT tool with above utilities.

## 🧰 Debugging / Notes

- "collection-slug" refers to the unique identifier associated with the collection. Often found at the end of the collection link: https://opensea.io/collection/azuki => azuki
- This project utilizes mongoDB to support multi-guild functionality and is used to host indexed metadata. See more here [mongoDB Docs](https://www.mongodb.com/docs/mongodb-vscode/connect/)
- Discord bot is built using discord.js v13 with a focus on slash command utility. See more here [discord.js Guide](https://discordjs.guide/interactions/slash-commands.html#registering-slash-commands)
- For production deployment see the file src/deploy.js for more information on how to register slash commands.
- Due note that using specific OpenSea endpoints requires an API key. See more here on requesting a free key [OpenSea Docs](https://docs.opensea.io/reference/request-an-api-key)
- The Etherscan API is utilized for eth/gas conversion as well as smart contract scraping. See more on getting a key here [Etherscan API Docs](https://docs.etherscan.io/)
- ETH conversion is dependent on CoinGecko's API. See more here [CoinGecko Docs](https://www.coingecko.com/en/api/documentation)
- Rank Rarity scoring is close/comparable to many other rarity sites such as RaritySniffer or NFTNerds by using normalized frequencies of traits. Trait count weighting is also considered as a separate rank.
- Previously I used a private geth light node alongside a local IPFS gateway due to the amount of requests surpassing the free tiers from providers such as Alchemy or Infura. Since then I have optimized the amount of calls and am able to perform using previously mentioned providers at an affordable level.
- Running private nodes may be an option when scaling a product like this, or simply purchasing higher plan tiers from providers to open up bandwidth.

## 🛠 Dependencies Include:

- [mongoose](https://www.npmjs.com/package/mongoose)
- [@discordjs/builders](https://www.npmjs.com/package/@discordjs/builders)
- [@discordjs/rest](https://www.npmjs.com/package/@discordjs/rest)
- [discord-api-types](https://www.npmjs.com/package/discord-api-types)
- [discord.js](https://www.npmjs.com/package/discord.js)
- [api](https://www.npmjs.com/package/api)
