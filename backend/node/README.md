# GridSense AI — Node.js API Gateway / BFF

The Node.js backend serves as the **API Gateway / Backend-for-Frontend (BFF)** for GridSense AI. It bridges the React dashboard frontend with the Python ML intelligence engine (`backend/ml`).

## Features
- **Centralized API Surface**: Exposes unified REST endpoints (`/api/forecast`, `/api/risk`, `/api/recommendations`, `/api/simulate`, `/api/dashboard/:site_id`).
- **Resilient Fallback Mode**: When the Python ML service is offline (e.g. during model training), the gateway transparently provides realistic demo datasets conforming to the MVP specification.
- **Aggregated Endpoints**: `/api/dashboard/:site_id` allows the frontend to retrieve all essential operational metrics in a single network roundtrip.
- **Request Validation**: Validates simulation inputs using Zod.

## Setup & Running

1. **Install dependencies**:
   ```bash
   cd backend/node
   npm install
   ```

2. **Configuration**:
   Copy `.env.example` to `.env`:
   ```bash
   PORT=5000
   ML_SERVICE_URL=http://localhost:8000
   USE_MOCK_FALLBACK=true
   CORS_ORIGIN=http://localhost:5173
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Verify Health**:
   Open [http://localhost:5000/api/health](http://localhost:5000/api/health) in your browser or run:
   ```bash
   curl http://localhost:5000/api/health
   ```

