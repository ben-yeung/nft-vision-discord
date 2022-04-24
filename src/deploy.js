const { REST } = require('@discordjs/rest')
const fs = require('fs');
const path = require('path');
const botconfig = require('./botconfig.json');
const { Routes } = require('discord-api-types/v9');

// Initializing slash commands
exports.initializeCommands = async (client) => {
    const commands = [];
    const commandFiles = fs.readdirSync(path.resolve(__dirname, './commands')).filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        commands.push(command.data.toJSON());
        client.commands.set(command.data.name, command);
    }

    const rest = new REST({ version: '9' }).setToken(botconfig.TOKEN);

    // Used for deleting all global commands. Be careful!
    // await rest.get(Routes.applicationCommands(botconfig.CLIENT_ID))
    //     .then(data => {
    //         const promises = [];
    //         for (const command of data) {
    //             const deleteUrl = `${Routes.applicationCommands(botconfig.CLIENT_ID)}/${command.id}`;
    //             promises.push(rest.delete(deleteUrl));
    //         }
    //         return Promise.all(promises);
    //     });

    // Use the line below to enable slash commands globally (Takes a while to cache) 
    // await rest.put(Routes.applicationCommands(botconfig.CLIENT_ID), { body: commands });

    // Register with specific guild for testing/development
    await rest.put(Routes.applicationGuildCommands(botconfig.CLIENT_ID, botconfig.GUILD_ID), { body: commands })
        .then(() => console.log('Successfully registered application commands.'))
        .catch(console.error);
}