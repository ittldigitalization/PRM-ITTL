# Local Production Deployment Guide

## Overview

The application has been prepared and built for production:
- **Frontend:** Built with Vite and compiled into optimized static assets in `client/dist`.
- **Backend API & Server:** Express server configured to serve both the API endpoints (`/api/*`) and the frontend bundle (`client/dist`) from a single port (`5000`).
- **Network Access:** Configured to bind to `0.0.0.0`, allowing access across your entire local network (LAN / Wi-Fi).

---

## How to Start the Application

### Option 1: Double-Click Startup Script (Windows)
Double-click:
```
startup/startup.bat
```

### Option 2: Command Line (From project root)
```bash
npm start
```

---

## How to Access the Application

### On the Server Machine:
Open any browser and navigate to:
```
http://localhost:5000
```

### From Other Computers / Phones / Tablets on the Local Network:
1. Find your server machine's local IP address (Run `ipconfig` in Command Prompt and check `IPv4 Address`, e.g., `192.168.1.50`).
2. Open any device on the same Wi-Fi/LAN and navigate to:
```
http://<SERVER_IP>:5000
```
*(Example: `http://192.168.1.50:5000`)*

---

## Rebuilding After Code Changes

If you make any changes to the frontend code in the future, rebuild the production bundle by running:
```bash
npm run build
```
Then restart the server with `npm start`.

---

## Environment Configuration

- **Server configuration:** `server/.env`
  - `PORT=5000`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Client configuration:** `client/.env`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
