# EasyKavach Render Deployment Guide 🚀

I've configured your project to run on **Render** using a **Blueprint**. This keeps your backend active 24/7, maintains your persistent SQLite database, and serves your React frontend.

## 1. Deploy via Blueprint (Fastest)

1.  Commit and **Push** all recent changes to your GitHub repository.
2.  Go to your [Render Dashboard](https://dashboard.render.com).
3.  Click **"New"** -> **"Blueprint"**.
4.  Connect your `EasyKavach` repository.
5.  Render will automatically detect the `render.yaml` file and create:
    *   **easykavach-api**: A Python Web Service with a 1GB Persistent Disk.
    *   **easykavach-ui**: A Static Site for your frontend.

## 2. Setting up Environment Variables

Once Render starts creating your services, you'll need to add your API keys:

### Backend (easykavach-api)
In the Render dashboard for the API service, go to **Environment** and add:
- `OWM_API_KEY`: Your OpenWeatherMap key.
- `SECRET_KEY`: A random string for security.

### Frontend (easykavach-ui)
The Blueprint automatically sets `VITE_API_BASE_URL`, but you should double-check after deployment:
1.  Copy the URL of your **easykavach-api** (e.g., `https://easykavach-api.onrender.com`).
2.  Go to the **easykavach-ui** settings and ensure `VITE_API_BASE_URL` is set to `https://your-api-url.onrender.com/api/v1`.

## 3. Database Persistence 💾

Your database is now stored at `/var/data/easykavach.db`.
-   This data **persists** even if you redeploy the code.
-   To manually seed the database in production, you can use the **Shell** tab in the Render dashboard for your API service:
    ```bash
    cd backend
    python -c "from app.seed.seed_data import seed_db; seed_db()"
    ```

## 4. Key Improvements
-   **No More Serverless Hacks**: We are running a real, continuous Python process.
-   **Dynamic CORS**: I've updated the backend to automatically trust your Render frontend URL.
-   **Relative/Absolute API Proxy**: The frontend now automatically detects its environment and hits the correct API endpoint.
