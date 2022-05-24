const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js")
const guildSchema = require('../schemas/guild-schema');

async function clearList(interaction) {
    let res = await guildSchema.findOne({ guild_id: interaction.guild.id });
    if (!res) {
        await new guildSchema({ guild_id: interaction.guild.id, guild_name: interaction.guild.name, alerts_channel: '' }).save();
        res = await guildSchema.findOne({ guild_id: interaction.guild.id });
    }
    try {
        const res = await guildSchema.findOneAndUpdate({ guild_id: interaction.guild.id }, { collections: [] })
        if (res == null) return 'An error occurred. Please try again.';
    } catch (err) {
        return 'An error occurred. Please try again.';
    }

    return 'Clear confirmed. The monitor list has been wiped. Check with /getlist';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear the entire monitor list of collections. Must have admin perms.'),
    permission: 'ADMINISTRATOR',
    options: '',
    async execute(interaction, args, client) {

        let warningEmbed = new MessageEmbed()
            .setTitle('⚠️ WARNING ⚠️')
            .setDescription(`This command will clear the entire monitor list. \nPlease only do so if you want to clear the entire list. \nFor removing specific collections refer to /remove [collection-slug]`)
            .setFooter({ text: 'Buttons timeout in 30s' })
            .setColor(44774)

        const row = new MessageActionRow()
            .addComponents(new MessageButton()
                .setCustomId('clear_confirm')
                .setLabel('Confirm')
                .setStyle('SUCCESS')
            )
            .addComponents(new MessageButton()
                .setCustomId('clear_cancel')
                .setLabel('Cancel')
                .setStyle('DANGER')
            )

        await interaction.reply({ embeds: [warningEmbed], components: [row], ephemeral: true });

        const filter = (btn) => {
            return btn.user.id === interaction.user.id;
        }

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            max: 1,
            time: 1000 * 30
        })

        collector.on('collect', async (button) => {
            await button.deferUpdate();
        })

        collector.on('end', async (collection) => {
            if (collection.first()) {
                if (collection.first().customId == 'clear_confirm') {
                    let response = await clearList(interaction);
                    await interaction.editReply({ content: response, embeds: [], components: [] })
                } else if (collection.first().customId == 'clear_cancel') {
                    await interaction.editReply({ content: 'Clear aborted.', embeds: [], components: [] })
                }
            } else {
                await interaction.editReply({ content: 'An error occurred. Potentially timed out. Please try again.', embeds: [], components: [], ephemeral: true })
            }

        })

    },
}