---
description: How to run the EasyKavach development environment
---

To get the full EasyKavach experience, you need to run both the AI backend and the premium frontend simultaneously.

// turbo-all
## 1. Start the Backend
1. Open a new terminal.
2. Navigate to the backend directory: `cd backend`
3. (Optional) Activate your virtual environment: `source .venv/bin/activate`
4. Run the server: `python run.py`
   - *Note: This will automatically initialize and seed the `easykavach.db` if it doesn't exist.*

## 2. Start the Frontend
1. Open a second terminal.
2. Navigate to the frontend directory: `cd frontend`
3. Install dependencies (if not already done): `npm install`
4. Run the development server: `npm run dev`
5. Open the local URL provided (usually `http://localhost:5173`).

## 3. Verify Connection
1. Once both are running, the frontend should show the **"Initializing Secure Environment"** loader.
2. If the backend is unreachable, the dashboards will show empty states or loading spinners.
