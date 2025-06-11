# Movie Recommendation System

This document explains how to run the movie recommendation system on port 3002.

## Overview

The movie recommendation system runs on a separate port from the main backend, providing the following advantages:

- Calculating recommendations does not block other API operations
- More resources can be allocated
- Better performance under high load

## Startup Instructions

### 1. Starting with Terminal Command (Easiest Method)

Run the following command in a new terminal window:

```bash
cd movie-app-backend
PORT=3002 npm start
```

### 2. Starting with Custom Startup File

You can also start it using our custom startup file:

```bash
cd movie-app-backend
node start-recommendations.js
```

This file automatically sets the environment variables to start the backend on port 3002.

### 3. Starting with PM2 (For Production Environments)

You can run it in the background using the PM2 process manager:

```bash
# Install PM2 (if not installed)
npm install -g pm2

# Start the backend on port 3002
cd movie-app-backend
pm2 start start-recommendations.js --name "movie-recommendations"
```

## Troubleshooting

If you encounter an `ERR_CONNECTION_REFUSED` error:

1. Ensure the application is running on port 3002
2. Check that no other application is using port 3002
3. You can check which ports are in use with the following command:

   ```bash
   # Windows
   netstat -ano | findstr :3002

   # Linux/Mac
   lsof -i :3002
   ```

## Frontend Configuration

The frontend should be configured to make requests to port 3002 for the recommendation system. This configuration is located in the `movie-app/lib/config.ts` file and the `.env.local` file.
