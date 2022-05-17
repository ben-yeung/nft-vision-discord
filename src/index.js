const { Client, Intents, Collection } = require('discord.js');
const mongoose = require('mongoose');
const botconfig = require('./botconfig.json');
const token = botconfig.TOKEN // Discord Bot Token
const { initializeCommands } = require('./deploy');
const { monitor } = require('./utils/monitor-floor');
const { getEthPrice } = require('./utils/get-eth-price');
const guildSchema = require('./schemas/guild-schema');
const fs = require('fs');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_PRESENCES] });
client.commands = new Collection();

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (command.permission) {
        const user = interaction.member;
        const userPerms = interaction.channel.permissionsFor(user);
        if (!userPerms || !userPerms.has(command.permission)) return interaction.reply("You do not have the permissions to use this command :(")
    }

    try {
        await command.execute(interaction, [], client);
    } catch (error) {
        console.error(error);
    }
});

client.on('ready', async () => {
    await initializeCommands(client);
    const Guilds = client.guilds.cache;
    client.mongo = await mongoose.connect(botconfig.MONGO_URI, { keepAlive: true }); // a MongoDB is used to store collection data to be used when monitoring.

    Guilds.forEach(async function (guild, index) {
        try {
            const res = await guildSchema.findOne({
                guild_id: guild.id
            });

            // If guild is not in mongoDB, add it with a guildSchema
            // Else ignore and use already set values for commands
            if (!res) {
                console.log("New guild detected. Creating schema");
                const guildOBJ = {
                    guild_id: guild.id,
                    guild_name: guild.name,
                    alerts_channel: ''
                }
                await new guildSchema(guildOBJ).save();
            }

        } catch (err) {
            console.log(err);
            console.log("MongoDB closing connection.")
        }
    })

    client.user.setActivity('jpegs sell online', {
        type: 'WATCHING'
    });

    // See here for more details on how to get an OpenSea API Key
    // https://docs.opensea.io/reference/request-an-api-key
    client.OS_KEY = (botconfig.OS_API_KEY ? botconfig.OS_API_KEY : '');
    client.OS_INDEX_CNT = 0;
    client.OS_INDEX_QUEUE = [];
    client.OS_QUEUE = 0;
    client.OS_QUEUE_PRIO = 0;

    client.delay = (ms) => {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    await getEthPrice(client);
    setInterval(function () { getEthPrice(client) }, 60000);

    client.convertETH = (num) => {
        return Number((client.eth * num).toFixed(0));
    }

    setInterval(function () { monitor(client) }, 60000);
    console.log(`${client.user.username} is online!`);
})

client.on('guildCreate', async (guild) => {
    try {
        console.log(`Bot added to guild ${guild.name}. Creating schema`);
        const guildOBJ = {
            guild_id: guild.id,
            guild_name: guild.name,
            alerts_channel: ''
        }
        await new guildSchema(guildOBJ).save();
    } catch (err) {
        console.log(err);
        console.log("MongoDB closing connection.")
    }
})

client.on('guildDelete', async (guild) => {
    try {
        console.log(`Bot removed from guild ${guild.name}. Updating mongoDB`);
        await guildSchema.findOneAndRemove({ guild_id: guild.id });
    } catch (err) {
        console.log(err);
        console.log("MongoDB closing connection.")
    }
})

client.login(token)