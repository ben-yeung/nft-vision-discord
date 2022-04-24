const { Client, Intents, Collection } = require('discord.js');
const botconfig = require('./botconfig.json');
const token = botconfig.TOKEN // Discord Bot Token
const { initializeCommands } = require('./deploy');
const fs = require('fs');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const prefLen = botconfig.PREFIX.length;
client.commands = new Collection();

client.on('ready', async () => {
    await initializeCommands(client);
    console.log(`${client.user.username} is online!`);
})

// client.on('message', async message => {
//     if (message.author.bot) return;

//     var cmdStr = message.content.split(" ")[0].slice(prefLen).toLowerCase();
//     console.log(cmdStr);
//     var args = message.content.substring().filter(function (el) {
//         return el != ' ';
//     })

//     const command = client.commands.get(cmdStr);

//     if (!command) return;

//     try {
//         await command.execute(interaction, args, client);
//     } catch (error) {
//         console.error(error);
//     }
// })

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, [], client);
    } catch (error) {
        console.error(error);
    }
});

client.login(token)