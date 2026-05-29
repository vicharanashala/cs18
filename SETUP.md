# Setup Guide

Follow these instructions to get the FAQ Platform running locally.

## Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)
- Git

## 1. Clone the Repository

```bash
git clone <your-repository-url>
cd faqiter1
```

## 2. Environment Variables

This project uses environment variables to keep secrets secure. You must set them up before starting the servers.

### Backend

1. Navigate to the backend directory: `cd faq-website/backend`
2. Copy the example environment file: `cp .env.example .env`
3. Edit the `.env` file and fill in your actual credentials:
   - `MONGO_URI`: Your MongoDB connection string.
   - `JWT_SECRET`: A long, random string for signing auth tokens.
   - `GROQ_API_KEY`: API key for Groq integrations.
   - `JINA_API_KEY`: API key for Jina embeddings.
   - `OPENAI_API_KEY`: (Optional) API key for OpenAI.
   - `PORT`: Usually `3001`.

### Frontend

1. Navigate to the frontend directory: `cd ../frontend`
2. Copy the example environment file: `cp .env.example .env`
3. Edit the `.env` file:
   - `VITE_API_URL`: The URL of your backend (default is `http://localhost:3001`).

> [!WARNING]
> **Never commit your `.env` files.** They are ignored by Git, but be careful not to share them publicly or hardcode real passwords in `.env.example`.

## 3. Install Dependencies & Run

### Backend

```bash
cd faq-website/backend
npm install
npm run dev
```

### Frontend

Open a new terminal window:

```bash
cd faq-website/frontend
npm install
npm run dev
```

The frontend will typically run on `http://localhost:5173`.
