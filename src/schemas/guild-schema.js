const mongoose = require('mongoose');

const collection_schema = new mongoose.Schema({
    slug: {
        type: String,
        required: true
    },
    target: {
        type: Number,
        required: true
    },
    check_above: {
        type: Boolean,
        required: true
    }
});

const guild_schema = new mongoose.Schema({
    guild_id: {
        type: String,
        required: true
    },
    alerts_channel: String,
    collections: [collection_schema]
});

module.exports = mongoose.model('Guilds', guild_schema);