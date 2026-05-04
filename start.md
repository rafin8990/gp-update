## GP Warehouse – Full Startup Guide

This guide explains how to start **Backend API**, **Web Frontend (Next.js)**, and the **Android UHF app**, and how they connect for real‑time inbound updates.

---

## 1. Prerequisites

- **Node.js**: v18+ (for Backend and Frontend)
- **Yarn or npm**:
  - Examples here use `yarn`, but `npm` is fine (`npm run dev`, etc.).
- **PostgreSQL**: database reachable by the Backend (check `.env` in `Backend`).
- **Redis**: reachable by the Backend (for inbound dedupe & serial ranges).
- **Android Studio** with SDK + platform tools:
  - `adb` in PATH (for debugging / device connection).
- **Physical Android device** (UHF reader) on the **same network** as the backend server.

---

## 2. Backend API (Node/Express + Socket.IO)

**Location**: `Backend`

### 2.1. Configure environment

1. Copy example env (if you have one):

   ```bash
   cd Backend
   # If there is a .env.example use it:
   cp .env.example .env
   ```

2. Edit `.env` and set at least:

   - **PORT**: usually `5000`
   - **DB** connection (Postgres URL or components)
   - **REDIS** connection
   - **FRONTEND_URL**: where the Next.js app runs, e.g.:

     ```env
     FRONTEND_URL=http://localhost:3005
     PORT=5000
     ```

### 2.2. Install dependencies

```bash
cd Backend
yarn install
# or: npm install
```

### 2.3. Run database migrations (if needed)

```bash
yarn migrate
# or: npm run migrate
```

### 2.4. Start backend (with Socket.IO)

```bash
yarn dev
# or: npm run dev
```

- The server will listen on `PORT` (e.g. `http://localhost:5000`).
- Socket.IO is initialized in `src/server.ts` and will emit:
  - `inbound:new-scan` events that the frontend listens to for **live inbound updates**.

---

## 3. Web Frontend (Next.js dashboard)

**Location**: `Frontend`

### 3.1. Configure environment

The frontend connects to the backend using `NEXT_PUBLIC_API_URL`.

1. Create/edit `.env.local` in `Frontend`:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

   - This must match the **Backend base URL** (same host + port).
   - It is used for:
     - HTTP calls (e.g. `/api/v1/inbound/scan` via `app/api/inbound/scan/route.ts`)
     - Socket.IO client (`Frontend/lib/socket.ts`)

### 3.2. Install dependencies

```bash
cd Frontend
yarn install
# or: npm install
```

### 3.3. Start Next.js dev server

```bash
yarn dev
# or: npm run dev
```

- The app runs on **port 3005** (from `package.json`):
  - `http://localhost:3005`
- Confirm that:
  - You can open `http://localhost:3005` in the browser.
  - The Warehouse Inbound Gate page loads:
    - Path: `/inbound/warehouse-gate`
- The page listens to `inbound:new-scan` Socket.IO events and updates:
  - **Live inbound table**
  - **Activity log**
  - **Item-wise summary**

---

## 4. Wiring Backend & Frontend Together

To get **real-time inbound updates**:

1. **Backend** must be running on `http://<host>:5000` (or another port, but consistent):
   - `PORT` in `Backend/.env`.
2. **Frontend** must point to that backend:

   ```env
   NEXT_PUBLIC_API_URL=http://<host>:5000
   ```

3. In `Backend/src/server.ts`, `FRONTEND_URL` controls CORS for Socket.IO:

   ```env
   FRONTEND_URL=http://localhost:3005
   ```

Make sure:

- `Backend` and `Frontend` can reach each other (no firewall issues).
- When you open browser dev tools, you see:
  - `✅ Socket connected: ...` from `Frontend/lib/socket.ts`

---

## 5. Android UHF App (InventoryTagActivity)

**Location**: `UHF Development SDK/UHFDemoEn/uhfdemo`

This app sends scans to your backend (`/api/v1/inbound/scan`) so the web dashboard updates in real time.

### 5.1. Set backend URL in Android app

Open `ApiClient.java`:

```java
// UHF Development SDK/UHFDemoEn/uhfdemo/src/main/java/com/hc/uhfdemo/network/ApiClient.java
private static final String BASE_URL = "http://192.168.1.228:5000/api/v1/";
```

Steps:

1. Set `BASE_URL` to your **backend URL** + `/api/v1/`, e.g.:

   ```java
   private static final String BASE_URL = "http://<BACKEND_IP>:5000/api/v1/";
   ```

   - `<BACKEND_IP>` must be reachable from the Android device:
     - If backend runs on your laptop and device is on same Wi‑Fi, use your laptop’s LAN IP (e.g. `192.168.1.228`).
   - Keep the `/api/v1/` suffix.

2. Make sure `NEXT_PUBLIC_API_URL` in the web frontend uses the **same base host/port** (only without `/api/v1`):

   ```env
   NEXT_PUBLIC_API_URL=http://<BACKEND_IP>:5000
   ```

### 5.2. Build and run Android app

1. Open `UHF Development SDK/UHFDemoEn/uhfdemo` in **Android Studio**.
2. Let Gradle sync.
3. Connect your UHF Android device via USB.
4. Select the appropriate **run configuration** (the demo app).
5. Click **Run** ▶ to install and launch on the device.

### 5.3. Using the app for inbound scans

Inside `InventoryTagActivity`:

1. Choose **communication mode**:
   - HTTP or Serial (button `bt_toggleSerial` / “Switch to Serial”).
   - With recent changes, **serial mode also triggers HTTP `/inbound/scan`** so the web dashboard still updates.
2. Select **Gate** (1 / 2 / 3) – this maps to `value` / user id.
3. Tap **Start Inventory** or use the hardware key to start scanning.
4. On each scan:
   - App sends data to backend:
     - `epc`, `rssi`, `deviceId`, `value` → `/api/v1/inbound/scan`
   - Backend:
     - Looks up PO/Item in DB.
     - Updates inbound records and `location_tracker`.
     - Emits `inbound:new-scan` over Socket.IO.
   - Frontend:
     - `WarehouseGatePage` receives event and updates the tables + activity log instantly.

You should see:

- Toasts on the Android device confirming “Scan sent …”
- Logs in backend mentioning `[INBOUND] Processing EPC ...`
- Rows appearing/updating in the **Warehouse Inbound Gate** page in real time.

---

## 6. Quick Start – Everything Together

1. **Backend**:

   ```bash
   cd Backend
   yarn install
   yarn migrate        # if needed
   yarn dev
   ```

2. **Frontend**:

   ```bash
   cd Frontend
   # ensure .env.local has NEXT_PUBLIC_API_URL=http://<BACKEND_IP>:5000
   yarn install
   yarn dev
   # open http://localhost:3005/inbound/warehouse-gate
   ```

3. **Android UHF App**:

   - Set `ApiClient.BASE_URL` to `http://<BACKEND_IP>:5000/api/v1/`.
   - Build & run on device via Android Studio.
   - Select gate (1/2/3), choose HTTP or Serial, start inventory, scan tags.

If all three are running correctly, every scan on the handheld should appear within seconds on the **Warehouse Inbound Gate** web dashboard.