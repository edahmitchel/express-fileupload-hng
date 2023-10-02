const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const amqp = require("amqplib");
const connectDB = require("./db");
const { Video } = require("./models/video.model");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const { v4: uuid } = require("uuid");
const { Worker } = require("worker_threads");
require("dotenv").config();
// Connect to RabbitMQ
const rabbitmqUrl = process.env.RABBIT_Url;
const startRecordingQueue = "startRecordingQueue";
async function setupRabbitMQ() {
  const connection = await amqp.connect(rabbitmqUrl);
  const channel = await connection.createChannel();

  // Declare a queue for sending start recording messages
  await channel.assertQueue(startRecordingQueue, { durable: true });

  // Process incoming messages from the queue
  channel.consume(startRecordingQueue, async (message) => {
    const messageContent = JSON.parse(message.content.toString());

    if (messageContent.startTranscription) {
      // Start the worker thread when a "start transcription" message is received
      startWorker(messageContent.id, messageContent.filename);
    }

    // Acknowledge the message to remove it from the queue
    channel.ack(message);
  });
}
//  start the worker thread
function startWorker(videoId, filename) {
  const worker = new Worker("./worker.js", {
    workerData: { videoId, filename },
  });

  worker.on("message", (message) => {
    if (message === "transcription_completed") {
      // Transcription is completed, close the worker thread
      worker.terminate();
    }
  });
}

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT || 3000;
const appUrl = process.env.APP_URL || "http://localhost:" + port;
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Video Upload API",
      version: "1.0.0",
      description: "API for uploading and managing videos",
    },
    servers: [
      {
        url: `${appUrl}`,
        description: "server",
      },
    ],
  },
  apis: ["./index.js"],
};

const specs = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
connectDB();

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, "uploads/");
    cb(null, dest);
  },
  filename: (req, file, callback) => {
    callback(null, Date.now() + "-" + file.originalname);
  },
});

//  filter to accept only video files
const videoFileFilter = (req, file, callback) => {
  if (file.mimetype.startsWith("video/")) {
    callback(null, true);
  } else {
    callback(new Error("Only video files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter: videoFileFilter });

app.use("/recordings", express.static(path.join(__dirname, "uploads")));

/**
 * @swagger
 * tags:
 *   name: Videos
 *   description: API endpoints for managing videos
 */

/**
 * @swagger
 * /video:
 *   post:
 *     summary: Upload a video file
 *     tags: [Videos]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *             required:
 *               - file
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: A success message
 *                 fileUrl:
 *                   type: string
 *                   description: URL of the uploaded file
 *       500:
 *         description: File upload failed
 */

app.post("/video", upload.single("file"), async (req, res) => {
  try {
    console.log(req.file);
    let uniqueFileName;

    const shortUniqueId =
      Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

    const fileExtension = path.extname(req.file.originalname);

    if (req.body.title) {
      uniqueFileName = `${req.body.title}-${shortUniqueId}${fileExtension}`;
    } else {
      uniqueFileName = `${shortUniqueId}${fileExtension}`;
    }

    console.log({ uniqueFileName });
    const filePath = path.join(__dirname, "uploads", uniqueFileName);

    await fs.promises.rename(req.file.path, filePath);

    const video = new Video({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      filename: uniqueFileName,
      size: req.file.size,
      title: req.body.title,
    });

    const savedVideo = await video.save();

    const fileUrl = appUrl + "/recordings/" + uniqueFileName;
    res.status(201).json({ message: "File uploaded successfully", fileUrl });
  } catch (error) {
    console.error("Error moving file:", error);
    res.status(500).json({ error: "File upload failed" });
  }
});
/**
 * @swagger
 * /video/uploads:
 *   post:
 *     summary: Upload multiple video files
 *     tags: [Videos]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *             required:
 *               - files
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 description: URL of an uploaded file
 *       500:
 *         description: File upload failed
 */

app.post("/video/uploads", upload.array("files", 1000), async (req, res) => {
  try {
    const uploadedVideos = [];

    for (const file of req.files) {
      const shortUniqueId =
        Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

      const fileExtension = path.extname(file.originalname);
      const uniqueFileName = `${shortUniqueId}${fileExtension}`;

      const filePath = path.join(__dirname, "uploads", uniqueFileName);

      await fs.promises.rename(file.path, filePath);

      const video = new Video({
        originalname: file.originalname,
        mimetype: file.mimetype,
        filename: uniqueFileName,
        size: file.size,
      });

      const savedVideo = await video.save();

      const appUrl = process.env.APP_URL || "http://localhost:" + port;
      const fileUrl = appUrl + "/recordings/" + uniqueFileName;
      uploadedVideos.push(fileUrl);
    }

    res.status(201).json(uploadedVideos);
  } catch (error) {
    console.error("Error moving files:", error);
    res.status(500).json({ error: "File upload failed" });
  }
});
/**
 * @swagger
 * /video/{id}:
 *   get:
 *     summary: Get video details by ID
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the video
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   description: Title of the video
 *                 fileUrl:
 *                   type: string
 *                   description: URL of the video file
 *       404:
 *         description: Video not found
 *       500:
 *         description: File retrieval failed
 */

app.get("/video/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const video = await Video.findOne({ _id: id });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }
    const fileUrl = appUrl + "/recordings/" + video.filename;

    res.status(201).json({
      title: video.filename,
      fileUrl,
      transcription: video?.transcription,
    });
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ error: "File retrieval failed" });
  }
});
/**
 * @swagger
 * /video:
 *   get:
 *     summary: Get a list of all uploaded videos
 *     tags: [Videos]
 *     responses:
 *       200:
 *         description: List of uploaded videos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                     description: Title of the video
 *                   fileUrl:
 *                     type: string
 *                     description: URL of the video file
 *       500:
 *         description: File list retrieval failed
 */

app.get("/video", async (req, res) => {
  try {
    const videos = await Video.find({}, "-_id filename");

    const uploadedVideos = videos.map((video) => ({
      title: video.filename,
      fileUrl: `${
        process.env.APP_URL || "http://localhost:" + port
      }/recordings/${video.filename}`,
      transcription: video?.transcription,
    }));

    res.json(uploadedVideos);
  } catch (error) {
    console.error("Error retrieving video list:", error);
    res.status(500).json({ error: "File list retrieval failed" });
  }
});

/**
 * @swagger
 * /start-recording:
 *   post:
 *     summary: Start recording a video
 *     tags: [Videos]
 *     responses:
 *       200:
 *         description: Recording started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID of the newly started recording
 *                 filename:
 *                   type: string
 *                   description: Filename of the video
 *       500:
 *         description: Error starting recording
 */

app.post("/start-recording", async (req, res) => {
  try {
    // Generate a unique filename for the video
    const filename = `${uuid()}.webm`;

    // Create an empty video file in the "static" folder
    const videoFilePath = path.join(__dirname, "uploads", filename);
    fs.writeFileSync(videoFilePath, Buffer.alloc(0));

    // Save information about the video in MongoDB
    const videoDoc = await Video.create({ filename });

    res.status(200).json({ id: videoDoc._id, filename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error starting recording" });
  }
});

/**
 * @swagger
 * /append-chunk/{id}:
 *   post:
 *     summary: Append a video chunk to a recording
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the video recording
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chunkData:
 *                 type: string
 *                 description: Base64-encoded video chunk data
 *             required:
 *               - chunkData
 *     responses:
 *       200:
 *         description: Video chunk appended successfully
 *       404:
 *         description: Video not found
 *       500:
 *         description: Error appending video chunk
 */

app.post("/append-chunk/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { chunkData } = req.body;

    // Find the video document by ID
    const videoDoc = await Video.findById(id);

    if (!videoDoc) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Append the received chunk data to the video file
    const videoFilePath = path.join(__dirname, "uploads", videoDoc.filename);
    fs.appendFileSync(videoFilePath, Buffer.from(chunkData, "base64"));

    res.status(200).json({ message: "Chunk appended successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error appending chunk" });
  }
});

/**
 * @swagger
 * /end-recording/{id}:
 *   post:
 *     summary: Finish recording and start transcription
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the video recording
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording finished and transcription started
 *       404:
 *         description: Video not found
 *       500:
 *         description: Error finishing recording and starting transcription
 */

app.post("/end-recording/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the video document by ID
    const videoDoc = await Video.findById(id);

    if (!videoDoc) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Publish  "start transcription"
    const channel = await setupRabbitMQ();
    await channel.sendToQueue(
      startRecordingQueue,
      Buffer.from(
        JSON.stringify({
          id: videoDoc._id,
          filename: videoDoc.filename,
          startTranscription: true,
        })
      ),
      { persistent: true }
    );

    res
      .status(200)
      .json({ message: "Recording finished and transcription started" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error finishing recording and starting transcription" });
  }
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
