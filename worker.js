// worker.js

const { parentPort } = require("worker_threads");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const deepgram = require("deepgram");
const { Video } = require("./models/video.model");

// Deepgram API key
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY; // Replace with your Deepgram API key

// Initialize Deepgram client
const client = deepgram({ apiKey: DEEPGRAM_API_KEY });

// Connect to MongoDB (make sure MongoDB is running)
mongoose.connect("mongodb://localhost:27017/mydb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function performTranscription(videoId, filePath) {
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

      // Notify the main thread that transcription is completed
      parentPort.postMessage("transcription_completed");
    } else {
      console.error("Transcription failed");
    }
  } catch (error) {
    console.error("Error performing transcription:", error);
  }
}

// Process messages received from the main thread
parentPort.on("message", (message) => {
  if (message === "start_transcription") {
    // Start transcription when a "start_transcription" message is received
    performTranscription(workerData.videoId, workerData.filename);
  }
});
