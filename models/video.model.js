const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  originalname: String,
  mimetype: String,
  filename: String,
  size: Number,
  transcription: String,
});

// Create the Video model using the videoSchema
const Video = mongoose.model("Video", videoSchema);

module.exports = { Video };
