FloodMap Guwahati — Requirements Document

1. Overview

FloodMap Guwahati is a real-time, crowdsourced flood intelligence platform designed to help users understand current flood conditions at a hyperlocal level.

The system combines:

Open-source weather and geographic data
Crowdsourced flood reports from users

Primary goal:

Provide actionable, real-time information about flooded or high-risk areas.

2. Core Objectives
   Deliver real-time flood visibility on a map
   Enable fast and simple user reporting
   Combine prediction (open data) with confirmation (crowd data)
   Work reliably on low-end devices and poor networks
   Require zero installation (PWA-based)
3. Target Users
   Daily commuters in Guwahati
   Delivery personnel
   Emergency responders (future)
   Local residents in flood-prone areas
4. Key Features
   4.1 Interactive Map
   Display map centered on Guwahati
   Show:
   Flood reports (markers)
   Flood-prone zones (polygons)
   Risk levels (color-coded)

Color scheme:

Red → Confirmed flooding
Orange → High risk
Yellow → Moderate risk
4.2 Flood Reporting System

Users must be able to submit reports in <10 seconds.

Input fields:

Auto GPS location
Water level:
Ankle
Knee
Waist
Severe (vehicle impact)
Optional image upload
Timestamp (auto)

Output:

Report stored in database
Marker displayed instantly on map
4.3 Real-Time Updates
New reports appear instantly on map
Use WebSockets / realtime DB (Supabase/Firebase)
No manual refresh required
4.4 Data Layers
4.4.1 Static Layer
Flood-prone zones (manually curated initially)
4.4.2 Open Data Layer
Rainfall alerts (IMD)
Rainfall intensity (optional: NASA GPM)
4.4.3 Crowdsourced Layer
User-submitted reports
Primary source of real-time truth
4.5 Risk Engine (Rule-Based)

Basic logic:

IF rainfall > threshold AND area is flood-prone
→ mark as High Risk
IF user reports exist
→ mark as Confirmed Flood
IF no reports for X time
→ reduce risk level
4.6 Time Decay System
Reports expire after 2–3 hours
Risk reduces if no new reports
Prevents stale data from misleading users
4.7 Trust & Validation System (MVP)
Cluster reports:
1 report → low confidence
multiple reports → higher confidence
Optional:
“Is this still flooded?” confirmation button
4.8 PWA Capabilities
Installable on home screen
Offline caching (basic)
Optimized for:
Low bandwidth
Low-end Android devices 5. Non-Functional Requirements
Performance
Map load time < 3 seconds
Report submission < 10 seconds
Reliability
System must handle intermittent connectivity
Graceful fallback for failed API calls
Scalability (Initial)
Support 1,000–10,000 concurrent users 6. Tech Stack
Frontend
React (Vite or Next.js)
Mapbox GL JS or Leaflet
Backend
Supabase:
PostgreSQL (database)
Auth
Realtime subscriptions
Storage
Supabase Storage / Cloudinary (images)
Deployment
Vercel / Netlify 7. Data Model
FloodReport
id: UUID
latitude: float
longitude: float
water_level: enum
image_url: string (optional)
timestamp: datetime
user_id: UUID 8. MVP Milestones
Phase 1
Map loads with Guwahati view
Phase 2
Static flood-prone zones added
Phase 3
Reporting system implemented
Phase 4
Real-time updates enabled
Phase 5
Basic risk logic implemented
Phase 6
Time decay + trust system
Phase 7
PWA optimization 9. Success Metrics
Number of active users during rainfall
Number of reports submitted per day
Report density per area
User retention during flood events 10. Future Enhancements
AI-based image validation
Predictive flood modeling (ML)
Smart routing (avoid flooded roads)
API for logistics companies
Integration with government systems
IoT sensor integration (long-term) 11. Risks
Low user participation → insufficient data
Fake/spam reports
Inaccurate predictions from weak data
Poor network conditions affecting usability 12. Guiding Principles
Speed over perfection
Simplicity over complexity
Real-time usefulness over theoretical accuracy
Ship early, improve continuously 13. Definition of Done (MVP)

The product is considered MVP-complete when:

Users can open a link and see flood conditions instantly
Users can report flooding in under 10 seconds
Reports appear live on the map
Risk levels update dynamically
System works reliably on mobile browsers
