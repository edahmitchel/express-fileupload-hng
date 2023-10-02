// worker.js

const { parentPort } = require("worker_threads");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const deepgram = require("deepgram");
const { Video } = require("./models/video.model");
require("dotenv").config();
const { MONGO_URI } = process.env;

// Deepgram API key
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// Initialize Deepgram client
const client = deepgram({ apiKey: DEEPGRAM_API_KEY });

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function performTranscription(videoId, filePath) {
  let connectionOpen = true; //  track connection

  try {
    console.log(`Transcribing audio for video with ID: ${videoId}`);

    // Transcribe the audio using Deepgram
    const transcription = await client.transcribe(filePath);

    if (transcription) {
      console.log(`Transcription completed for video with ID: ${videoId}`);

      // Update the MongoDB document with the transcription text
      const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { transcription },
        { new: true }
      );

      // Close the MongoDB connection
      await mongoose.connection.close();
      connectionOpen = false;

      // Notify the main thread that transcription is completed
      parentPort.postMessage("transcription_completed");
    } else {
      console.error("Transcription failed");
    }
  } catch (error) {
    console.error("Error performing transcription:", error);
  } finally {
    if (connectionOpen) {
      // Close the MongoDB connection if it's still open (in case of an error)
      await mongoose.connection.close();
    }
  }
}

// Process messages received from the main thread
parentPort.on("message", (message) => {
  if (message === "start_transcription") {
    // Start transcription when a "start_transcription" message is received
    performTranscription(workerData.videoId, workerData.filename);
  }
});
