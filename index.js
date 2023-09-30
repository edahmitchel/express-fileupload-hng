const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const connectDB = require("./db");
const { Video } = require("./models/video.model");

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();
const app = express();
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
    res.status(201).json({ title: video.filename, fileUrl });
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
    }));

    res.json(uploadedVideos);
  } catch (error) {
    console.error("Error retrieving video list:", error);
    res.status(500).json({ error: "File list retrieval failed" });
  }
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
