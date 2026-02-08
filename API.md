# API Documentation for Bahiq Meet Bot

## Overview
This document describes the API endpoints for the Bahiq Meet Bot. The API provides functionality for creating bots, retrieving transcripts, stopping bots, listing active bots, and saving transcripts to Google Sheets.

## Endpoints

### 1. Create Bot
**POST** `/api/bots/create`
- **Description:** Creates a new bot instance.
- **Request Body:**
  ```json
  {
    "botName": "string",
    "settings": {
      "setting1": "value",
      "setting2": "value"
    }
  }
  ```
- **Response:**
  - **200 OK**: Bot created successfully.
  - **400 Bad Request**: Invalid input data.

### Example
```bash
curl -X POST http://example.com/api/bots/create \
-H "Content-Type: application/json" \
-d '{"botName": "MyBot", "settings": {"setting1": "value1"}}'
```

### Error Handling
- Return a meaningful error message for invalid inputs.


### 2. Get Transcripts
**GET** `/api/transcripts/{botId}`
- **Description:** Retrieves the transcript for a specified bot.
- **Parameters:**
  - `botId` (path parameter) - ID of the bot to fetch the transcript for.
- **Response:**
  - **200 OK**: Returns the transcript content.
  - **404 Not Found**: Bot ID not found.

### Example
```bash
curl http://example.com/api/transcripts/1234
```

### 3. Stop Bot
**POST** `/api/bots/stop`
- **Description:** Stops a running bot.
- **Request Body:**
  ```json
  {
    "botId": "string"
  }
  ```
- **Response:**
  - **200 OK**: Bot stopped successfully.
  - **404 Not Found**: Bot ID not found.

### Example
```bash
curl -X POST http://example.com/api/bots/stop \
-H "Content-Type: application/json" \
-d '{"botId": "1234"}'
```

### Error Handling
- Handle cases where the bot ID is invalid.


### 4. List Active Bots
**GET** `/api/bots/active`
- **Description:** Lists all active bots.
- **Response:**
  - **200 OK**: Returns a list of active bots.

### Example
```bash
curl http://example.com/api/bots/active
```

### 5. Save Transcripts to Google Sheets
**POST** `/api/transcripts/save`
- **Description:** Saves a transcript to Google Sheets.
- **Request Body:**
  ```json
  {
    "botId": "string",
    "transcript": "string"
  }
  ```
- **Response:**
  - **200 OK**: Transcript saved successfully.
  - **400 Bad Request**: Invalid input data.

### Example
```bash
curl -X POST http://example.com/api/transcripts/save \
-H "Content-Type: application/json" \
-d '{"botId": "1234", "transcript": "Transcript content here."}'
```

### Error Handling
- Provide clear error messages for any issues saving to Google Sheets.

## Conclusion
This API enables seamless interaction with the Bahiq Meet Bot, facilitating various operations related to bot management and transcript handling.

---

> **Note:** Make sure to handle authentication and rate limiting as needed in your implementation.