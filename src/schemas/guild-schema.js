const mongoose = require("mongoose");

const collection_schema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
  },
  target: {
    type: Number,
    required: true,
  },
  check_above: {
    type: Boolean,
    required: true,
  },
  last_check: {
    type: Number,
    required: true,
  },
});

const guild_schema = new mongoose.Schema({
  guild_id: {
    type: String,
    required: true,
  },
  guild_name: {
    type: String,
    required: true,
  },
  alerts_channel: String,
  collections: [collection_schema],
  aliases: Object,
});

module.exports = mongoose.model("Guilds", guild_schema);
