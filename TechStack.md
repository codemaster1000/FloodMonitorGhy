FloodMap Guwahati — Tech Stack & Project Structure

1. Tech Stack Requirements
   1.1 Frontend
   Framework: React (Vite or Next.js preferred)
   Language: TypeScript
   Map Library: Mapbox GL JS (preferred) or Leaflet
   State Management: Zustand (lightweight) or React Context
   Styling: Tailwind CSS
   1.2 Backend (BaaS Approach)
   Platform: Supabase
   PostgreSQL database
   Realtime subscriptions
   Authentication (optional for MVP)
   Storage (images)
   1.3 APIs & Data Sources
   Weather Alerts: India Meteorological Department
   Rainfall Data (optional): NASA (GPM)
   Maps: Mapbox / OpenStreetMap tiles
   1.4 Deployment
   Frontend Hosting: Vercel / Netlify
   Backend: Supabase Cloud
   1.5 PWA Support
   Service Worker: Workbox or Vite PWA plugin
   Manifest: Required for installability
2. System Architecture

Client (PWA)
↓
Supabase (DB + Realtime + Storage)
↓
External APIs (IMD / NASA)

3. Project Directory Structure
   Root Structure
   floodmap-guwahati/
   │
   ├── public/
   ├── src/
   ├── .env
   ├── package.json
   ├── tsconfig.json
   └── vite.config.ts / next.config.js
4. Frontend Directory (src/)
   src/
   │
   ├── app/ # App entry (Next.js) OR main.tsx (Vite)
   ├── components/
   ├── features/
   ├── hooks/
   ├── services/
   ├── store/
   ├── utils/
   ├── types/
   ├── styles/
   └── assets/
5. Detailed Folder Breakdown
   5.1 components/

Reusable UI elements

components/
├── Map/
│ ├── MapView.tsx
│ ├── MapMarker.tsx
│ └── MapLegend.tsx
│
├── Report/
│ ├── ReportButton.tsx
│ ├── ReportModal.tsx
│ └── WaterLevelSelector.tsx
│
├── UI/
│ ├── Button.tsx
│ ├── Loader.tsx
│ └── Toast.tsx
5.2 features/

Feature-based modules

features/
├── floodReports/
│ ├── reportService.ts
│ ├── reportSlice.ts (if using state)
│ ├── useReports.ts
│
├── map/
│ ├── mapService.ts
│ └── useMap.ts
│
├── alerts/
│ ├── alertService.ts
│ └── useAlerts.ts
5.3 hooks/
hooks/
├── useGeolocation.ts
├── useRealtimeReports.ts
├── useNetworkStatus.ts
5.4 services/

External integrations

services/
├── supabaseClient.ts
├── imdService.ts
├── nasaService.ts
5.5 store/

Global state

store/
├── useAppStore.ts
5.6 utils/
utils/
├── riskEngine.ts
├── timeDecay.ts
├── clustering.ts
5.7 types/
types/
├── FloodReport.ts
├── MapTypes.ts 6. Backend (Supabase Structure)
Tables
flood_reports
id (uuid, primary key)
latitude (float)
longitude (float)
water_level (enum)
image_url (text)
created_at (timestamp)
user_id (uuid, optional)
Storage Buckets
flood-images/
Realtime
Enable realtime on flood_reports table 7. Environment Variables
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPBOX_TOKEN= 8. Key Core Files
supabaseClient.ts

Handles DB connection

MapView.tsx

Main map rendering logic

ReportModal.tsx

Handles user input

riskEngine.ts

Combines:

rainfall data
historical zones
user reports 9. PWA Files
public/
├── manifest.json
├── icons/
├── service-worker.js 10. Development Workflow
Setup project + map
Add Supabase connection
Implement reporting
Display reports on map
Add realtime updates
Add risk engine
Optimize PWA 11. Code Principles
Keep components small and reusable
Avoid premature abstraction
Prefer simple logic over complex systems
Build features incrementally
