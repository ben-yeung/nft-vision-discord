const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Play some ping pong'),

    async execute(interaction, args, client) {
        let ping = Math.abs(Date.now() - interaction.createdTimestamp);
        await interaction.reply("Pinging...");
        interaction.editReply({ content: `Pong! :ping_pong: Latency: ${ping}ms. API Latency: ${client.ws.ping}ms` });
    },
}