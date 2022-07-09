const mongoose = require("mongoose");

const metadata_schema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
  },
  ranks: {
    type: Object,
    required: true,
  },
  ranksArr: {
    type: Array,
    required: true,
  },
});

module.exports = mongoose.model("collection_ranks", metadata_schema);
