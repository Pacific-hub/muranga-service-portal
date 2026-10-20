# Murang'a County Public Service Request Portal

A full-stack public service request management system built with **Node.js**, **Express**, **SQLite**, and **Tailwind CSS**. Citizens can report civic infrastructure issues (streetlighting, water supply, garbage collection, road maintenance) and track resolution progress, while County Staff Administrators manage dispatches and monitor live resolution analytics.

## Project Structure
- `server.js` — Express REST API server and Multer file upload handler
- `database.js` — SQLite3 schema initialization and seed data (`muranga_portal.db`)
- `public/index.html` — Public landing page and instant ticket lookup
- `public/login.html` — Role-separated authentication portal (Citizen vs Staff Admin)
- `public/citizen.html` — Citizen dashboard for submitting and tracking service requests
- `public/admin.html` — Staff Administrator portal with analytics, filtering, status updates, and CSV export
- `public/js/app.js` — Frontend client logic and API integration

## How to Run Locally
1. Install dependencies:
   ```bash
   npm install