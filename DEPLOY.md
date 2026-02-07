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
        -   `VITE_FRONTEND_URL`: `https://your-vercel-app-name.vercel.app` (You can add this later after deploying the frontend, or use `*` temporarily).
            -   **Important**: Ensure there is **NO trailing slash** at the end (e.g., `...app`, NOT `...app/`).
    -   **Note**: Do NOT set `NODE_ENV` to `production` here, as it will prevent the installation of build dependencies. The start command handles this automatically.
6.  Click **Create Web Service**.
7.  Wait for the deployment to finish. Copy the **Service URL** (e.g., `https://veloz-chess-backend.onrender.com`).

---

## Step 3: Database Migration

When you create a new database on Supabase, it is empty. Your application code expects certain tables (like `users` and `games`) to exist. **Migrations** are the process of creating these tables.

We use a tool called `drizzle-kit` to push your local schema definition (in `shared/schema.ts`) to the remote database.

**Run this command in your LOCAL terminal (not on Render):**

1.  Open your terminal in the project folder.
2.  Run the following command, replacing the value with your actual Supabase connection string:
    ```bash
    # Linux/Mac (Use single quotes to avoid issues with special characters like !)
    DATABASE_URL='postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres' npm run db:push

    # Windows (PowerShell)
    $env:DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"; npm run db:push
    ```
    *(If your password still causes issues, you may need to URL encode special characters)*
3.  You should see output indicating that tables are being created.
    -   If it asks to approve changes, type `y` and press Enter.
    -   If it says "No changes detected", your database is already up to date.

**Troubleshooting:**
-   **Connection Refused (IPv6 Issue)**: If you see `ECONNREFUSED` with an IPv6 address (like `2406:da1a...`), it means your network is blocking the direct IPv6 connection to Supabase.
    -   **Fix**: Switch back to port **6543** (the pooler port), which usually handles IPv4 better.
    -   **Important**: Ensure you remove the square brackets `[]` around your password!
        -   **Wrong**: `...:postgres:[MyPassword]@...`
        -   **Right**: `...:postgres:MyPassword@...`

-   **Password Authentication Failed (Still failing?)**:
    1.  **Wrong Password**: It is very common to mistake the *Database* password for the *Supabase Account* password. They are different.
        -   **Fix**: Go to Supabase Dashboard -> Project Settings -> Database -> **Reset Database Password**. Set a new, simple password (alphanumeric only, no symbols) to test.
    2.  **Try Direct Connection**: The pooling connection (port 6543) can sometimes be finicky with certain drivers.
        -   Try using the **Direct Connection** string (port 5432) instead. It looks like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres` (Change `6543` to `5432`).
-   **Connection Error**: Double-check your password and ensuring you are using the correct host (aws-0-[region]....).
-   **SSL Error**: If you see SSL errors, you may need to append `?sslmode=require` to the end of your connection string.

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
        -   **Output Directory**: `dist/public`
            > [!IMPORTANT]
            > **YOU MUST CHANGE THIS.** The default is usually `dist`. You **MUST** change it to `dist/public`.
            > If you don't do this, Vercel will try to serve your backend code (`dist/index.cjs`) instead of your website, causing the "file download" issue.
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
