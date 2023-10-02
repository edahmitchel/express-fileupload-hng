# Video Upload API Documentation

## Overview

The Video Upload API is designed to facilitate the uploading and management of video files. It provides endpoints for uploading single or multiple video files, retrieving video details by ID, getting a list of all uploaded videos, starting and managing video recordings, and appending video chunks.

### Base URL

The base URL for this API is determined by the `APP_URL` environment variable and defaults to `http://localhost:PORT` (where `PORT` is either the specified port or the default port 3000).

## Authentication

This API does not require authentication for most provided endpoints. However, you can implement authentication and authorization as needed for your application.

## Endpoints

### Upload a Video

- **Endpoint**: `POST /video`
- **Summary**: Upload a single video file.
- **Request Type**: `multipart/form-data`
- **Request Body**:
  - `file` (File, required): The video file to upload.
  - `title` (String, optional): The title of the video.
- **Responses**:
  - `201 Created`: File uploaded successfully.
    - Response JSON:
      - `message` (String): A success message.
      - `fileUrl` (String): URL of the uploaded file.
  - `500 Internal Server Error`: File upload failed.

### Upload Multiple Videos

- **Endpoint**: `POST /video/uploads`
- **Summary**: Upload multiple video files in a single request.
- **Request Type**: `multipart/form-data`
- **Request Body**:
  - `files` (Array of Files, required): An array of video files to upload.
- **Responses**:
  - `201 Created`: Files uploaded successfully.
    - Response JSON:
      - An array of strings, each representing the URL of an uploaded file.
  - `500 Internal Server Error`: File upload failed.

### Get Video Details by ID

- **Endpoint**: `GET /video/{id}`
- **Summary**: Retrieve video details by specifying the video's unique ID.
- **Parameters**:
  - `id` (Path Parameter, required): The ID of the video.
- **Responses**:
  - `200 OK`: Video details retrieved successfully.
    - Response JSON:
      - `title` (String): Title of the video.
      - `fileUrl` (String): URL of the video file.
  - `404 Not Found`: Video not found.
  - `500 Internal Server Error`: File retrieval failed.

### Get a List of Uploaded Videos

- **Endpoint**: `GET /video`
- **Summary**: Retrieve a list of all uploaded videos.
- **Responses**:
  - `200 OK`: List of uploaded videos retrieved successfully.
    - Response JSON:
      - An array of objects, each containing:
        - `title` (String): Title of the video.
        - `fileUrl` (String): URL of the video file.
        - `transcriptio` (String): transcription of the video file.

### Start Recording a Video

- **Endpoint**: `POST /start-recording`
- **Summary**: Start recording a new video.
- **Responses**:
  - `200 OK`: Recording started successfully.
    - Response JSON:
      - `id` (String): ID of the newly started recording.
      - `filename` (String): Filename of the video.

### Append a Video Chunk

- **Endpoint**: `POST /append-chunk/{id}`
- **Summary**: Append a video chunk to an existing recording.
- **Parameters**:
  - `id` (Path Parameter, required): The ID of the video recording.
- **Request Body**:
  - `chunkData` (String, required): Base64-encoded video chunk data.
- **Responses**:
  - `200 OK`: Video chunk appended successfully.
  - `404 Not Found`: Video not found.
  - `500 Internal Server Error`: Error appending video chunk.

### Finish Recording and Start Transcription

- **Endpoint**: `POST /end-recording/{id}`
- **Summary**: Finish recording and start transcription for a video.
- **Parameters**:
  - `id` (Path Parameter, required): The ID of the video recording.
- **Responses**:
  - `200 OK`: Recording finished, and transcription started.
  - `404 Not Found`: Video not found.
  - `500 Internal Server Error`: Error finishing recording and starting transcription.

## Worker Thread, RabbitMQ, and Transcription

### Worker Thread

The Video Upload API utilizes a worker thread to handle video transcription tasks. When a video recording is finished and transcription needs to start, the API sends a message to RabbitMQ, which triggers the worker thread. The worker thread performs the transcription using Deepgram and updates the MongoDB document with the transcription text.

### RabbitMQ Integration

RabbitMQ is used for message queuing in the Video Upload API. Specifically, it is employed to manage the transcription process. When a video recording is finished, a message is sent to a RabbitMQ queue, which is then consumed by the worker thread to initiate transcription. Ensure that RabbitMQ is properly configured and accessible by the API for this feature to work.

### Transcription Process

The transcription process involves sending the audio data of a video recording to the Deepgram service. Deepgram transcribes the audio and returns the transcription text, which is then associated with the video in the database. Make sure to provide the necessary environment variables, including the Deepgram API key (`DEEPGRAM_API_KEY`) and MongoDB URI (`MONGO_URI`), for successful transcription.

This README provides an overview of the Video Upload API's capabilities and how to use it. You can explore the API further by referring to the Swagger documentation for detailed endpoint descriptions and examples.

### Swagger Documentation

You can access the Swagger documentation for this API by visiting the `/api-docs` endpoint in your browser. This documentation provides interactive access to the API endpoints and detailed information about request and response schemas.

## Running the API

To run the Video Upload API, execute the Node.js application with the appropriate configuration settings. By default, the API will run on port 3000. You can customize the port and other settings by modifying the `.env` file or specifying environment variables.

```bash
# Install dependencies
npm install

# Start the server
npm start
```
