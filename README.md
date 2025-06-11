# Movie Recommendation Application

This project is a web application that allows users to receive movie recommendations and track their watched movies. It consists of two main components: backend and frontend.

## Project Structure

- **movie-app-backend**: Backend API and movie recommendation system
- **movie-app**: Frontend application developed with Next.js
- **movie-poster-updater**: Tool used to update movie posters

## Getting Started

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd movie-app-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

4. Launch a new port for the recommendation system:
   ```bash
   node start-recommendations.js
   ```

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd movie-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Movie Recommendation System

The movie recommendation system runs on a separate port from the main backend, providing the following advantages:

- Calculating recommendations does not block other API operations
- More resources can be allocated
- Better performance under high load

For more details, see the [movie-app-backend/README-RECOMMENDATIONS.md](movie-app-backend/README-RECOMMENDATIONS.md) file.

## Screenshots
![image](https://github.com/user-attachments/assets/ba58f637-d579-46e4-be39-d6c6266adbc9)
![image](https://github.com/user-attachments/assets/a1bab2ef-9814-4cab-a744-815d9d470f37)
![image](https://github.com/user-attachments/assets/734e6398-efd5-47b8-87e6-7cbab3c358c0)
![image](https://github.com/user-attachments/assets/55954687-2654-4afb-b30a-63cb8fa320f2)
![image](https://github.com/user-attachments/assets/565ef520-cbad-45aa-aba6-2355ad53d7bf)
![image](https://github.com/user-attachments/assets/7ace6510-8823-4988-88cf-692994bba605)
![image](https://github.com/user-attachments/assets/52783862-3c52-40b2-9297-8fdceb81568e)
![image](https://github.com/user-attachments/assets/7ec58c5b-cc74-4ba1-9bcc-d33d11800d5b)
![image](https://github.com/user-attachments/assets/fb1305db-4cbd-4ace-b026-545665e627c3)
![image](https://github.com/user-attachments/assets/3606b1b2-bcaf-49b8-ac64-9bff545971fc)
![image](https://github.com/user-attachments/assets/f127403c-d95e-4e99-8bd9-1ec59dbc7afa)
![image](https://github.com/user-attachments/assets/13f638e4-c049-493a-afdd-43f6068b8a38)

<!-- Screenshots will be added here -->
