# Deployment Guide

This guide will walk you through deploying your Veloz Chess application using:
- **Database**: Supabase (PostgreSQL)
- **Backend**: Render (Node.js)
- **Frontend**: Vercel (React/Static)

## Prerequisites

1.  **GitHub Repository**: Ensure your code is pushed to GitHub.
    ```bash
    git push origin main
    ```
2.  **Accounts**: Sign up for free accounts on:
    -   [Supabase](https://supabase.com/)
    -   [Render](https://render.com/)
    -   [Vercel](https://vercel.com/)

---

## Step 1: Database (Supabase)

1.  Create a new project on Supabase.
2.  Once created, go to **Project Settings** -> **Database**.
3.  Copy the connection string under **Connection string** -> **Node.js**.
    -   It will look like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
    -   Replace `[password]` with the password you set during project creation.
4.  Save this string; you will need it for the Backend deployment.

---

## Step 2: Backend (Render)

1.  Go to the [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Configure the service**:
    -   **Name**: `veloz-chess-backend` (or similar)
    -   **Region**: Choose one close to you.
    -   **Branch**: `main`
    -   **Root Directory**: `.` (leave empty)
    -   **Runtime**: `Node`
    -   **Build Command**: `npm install && npm run build`
    -   **Start Command**: `npm start`
    -   **Instance Type**: Free
5.  **Environment Variables**:
    -   Scroll down to "Environment Variables" and add:
        -   `DATABASE_URL`: Paste the Supabase connection string from Step 1.
        -   `NODE_ENV`: `production`
        -   `VITE_FRONTEND_URL`: `https://your-vercel-app-name.vercel.app` (You can add this later after deploying the frontend, or use `*` temporarily).
6.  Click **Create Web Service**.
7.  Wait for the deployment to finish. Copy the **Service URL** (e.g., `https://veloz-chess-backend.onrender.com`).

---

## Step 3: Database Migration

After your backend is deployed, it should automatically connect to the database. However, you need to run migrations to create the tables.
You can run migrations locally pointing to the production database:

1.  In your local terminal:
    ```bash
    DATABASE_URL="your-supabase-connection-string" npm run db:push
    ```
    (Replace the string with your actual Supabase connection string).

---

## Step 4: Frontend (Vercel)

1.  Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  **Configure the project**:
    -   **Framework Preset**: Vite
    -   **Root Directory**: `client` (IMPORTANT: Change this from `.` to `client` if you want Vercel to only build the client, BUT since our root `package.json` handles the build, it's safer to keep Root Directory as `.` if you follow standard monorepo patterns, but for this specific setup:
        -   **Root Directory**: `.` (Leave as default)
        -   **Build Command**: `npm run build` (This builds everything, but Vercel primarily hosts the static files in `dist/public`).
        -   **Output Directory**: `dist/public` (You need to override the default `dist` to `dist/public` because that's where `vite` puts the frontend build in our custom script).
5.  **Environment Variables**:
    -   Add `VITE_API_URL`: Paste your Render Backend URL (e.g., `https://veloz-chess-backend.onrender.com`).
    -   Add `VITE_WS_URL`: Paste the Render URL but replace `https://` with `wss://` (e.g., `wss://veloz-chess-backend.onrender.com`).
6.  Click **Deploy**.

---

## Step 5: Final Configuration

1.  Once Vercel deploys, copy your new Vercel domain (e.g., `https://veloz-chess.vercel.app`).
2.  Go back to **Render Dashboard** -> **Environment Variables**.
3.  Update `VITE_FRONTEND_URL` to your Vercel domain (no trailing slash).
4.  Render will restart your backend service.

**Done!** Your Veloz Chess app is now live.
