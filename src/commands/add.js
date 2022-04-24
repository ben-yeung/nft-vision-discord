const { SlashCommandBuilder } = require('@discordjs/builders');
const guildSchema = require('../schemas/guild-schema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add a collection to monitor its floor price: add [collection slug] [price in ETH]')
        .addStringOption(option => option.setName('collection-slug').setDescription('OpenSea Collection slug. Commmonly found in the URL of the collection.').setRequired(true))
        .addNumberOption(option => option.setName('target-price').setDescription('Target price for collection (in ETH).').setRequired(true))
        .addBooleanOption(option => option.setName('above-target').setDescription('If you want to monitor for a buy in (below target price) set this to False. Defaults to True.')),
    options: '[collection-slug] [target-price] [Above?]',
    async execute(interaction, args, client) {

        const collectionSlug = interaction.options.getString('collection-slug');
        const targetPrice = interaction.options.getNumber('target-price');
        const checkAbove = (interaction.options.getBoolean('above-target') == null ? true : interaction.options.getBoolean('above-target'));
        const lastCheckDefault = (interaction.options.getBoolean('above-target') == null ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);

        const res = await guildSchema.findOne({ guild_id: interaction.guild.id });
        if (!res) await new guildSchema({ guild_id: interaction.guild.id, guild_name: interaction.guild.name, alerts_channel: '' }).save();

        if (res.alerts_channel == '') return interaction.reply('Please setup an alerts channel first with /setalerts in order to monitor collectionsd.')

        const newCollection = {
            slug: collectionSlug,
            target: targetPrice,
            check_above: checkAbove,
            last_check: lastCheckDefault
        }

        var collections = res.collections;
        var alreadyAdded = false;

        for (var i = 0; i < collections.length; i++) {
            if (collections[i].slug == collectionSlug) { // If collection exists in list already, update the values
                collections[i] = newCollection;
                alreadyAdded = true;
            }
        }

        if (!alreadyAdded) { // Else if collection does not exist, add it to the list
            collections.push(newCollection);
        }

        try {
            const res = await guildSchema.findOneAndUpdate({ guild_id: interaction.guild.id }, { collections: collections })
            if (res == null) return interaction.reply('An error occurred. Please try again.');
        } catch (err) {
            return interaction.reply('An error occurred. Please try again.');
        }

        let change = (alreadyAdded ? 'updated' : 'added');
        return interaction.reply(`Successfully ${change} **${collectionSlug}** with target price ${targetPrice}Ξ to monitor list.`);
    },
}