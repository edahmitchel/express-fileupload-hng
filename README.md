# Video Upload API Documentation

## Overview

The Video Upload API is designed to facilitate the uploading and management of video files. It provides endpoints for uploading single or multiple video files, retrieving video details by ID, and getting a list of all uploaded videos.

### Base URL

The base URL for this API is determined by the `APP_URL` environment variable and defaults to `http://localhost:PORT` (where `PORT` is either the specified port or the default port 3000).

## Authentication

This API does not require authentication for the provided endpoints. However, you can implement authentication and authorization as needed for your application.

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
