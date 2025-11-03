# EventHub (MERN)
<a href="https://eventhub-mern.vercel.app" target="_blank" rel="noopener noreferrer">Live demo - EventHub</a>
- [Source on GitHub](https://github.com/srithika22/EventHub-MERN)

EventHub is a full‑stack MERN application for discovering, creating, and managing events. This README has been updated to match the repository layout (frontend and backend folders) and to make the Table of Contents and API Endpoints interactive so clicking entries jumps directly to the relevant section.

---

## Table of contents

- [About](#about)  
- [Demo](#demo)  
- [Features](#features)  
- [Tech stack](#tech-stack)  
- [Repository structure](#repository-structure)  
- [Quickstart](#quickstart)  
- [Environment variables](#environment-variables)  
- [API Endpoints](#api-endpoints)  
  - [Auth endpoints](#auth-endpoints)  
  - [User endpoints](#user-endpoints)  
  - [Event endpoints](#event-endpoints)  
  - [RSVP / Attendee endpoints](#rsvp--attendee-endpoints)  
- [Frontend routes](#frontend-routes)  
- [Testing](#testing)  
- [Contributing](#contributing)  
- [License & Contact](#license--contact)

---

## About

EventHub helps users discover local events, create and manage events, RSVP and manage attendees. The app demonstrates a typical MERN architecture with JWT authentication, protected routes, and CRUD operations for events.

## Demo

Visit the deployed application: https://eventhub-mern.vercel.app

---

## Features

- User registration and authentication (JWT)
- Create, read, update, delete events
- RSVP / attendee management
- Search and filter events
- Responsive React UI
- RESTful API (JSON)

---

## Tech stack

- Frontend: React (Vite), React Router, Axios, Tailwind CSS / your chosen CSS framework
- Backend: Node.js, Express
- Database: MongoDB (Atlas or local)
- Authentication: JSON Web Tokens (JWT)
- Deployment: Vercel (frontend) — backend host depends on your server configuration (see DEPLOYMENT.md)

---

## Repository structure

The README reflects the current repository layout. Key top-level items observed:

- frontend/ — React app (Vite)
- backend/ — Express API and server code
- server/ — (present — check if duplicate or alternative API folder)
- .env.production, vercel.json, DEPLOYMENT.md, package.json, LICENSE, etc.

Note: If your working backend folder is named `server/` rather than `backend/`, use the folder that contains your Express app. The Quickstart section below assumes `backend/` and `frontend/`. Adjust commands if your structure differs.

---

## Quickstart

Run the app locally (using the observed frontend and backend folders).

1. Clone the repo
   ```bash
   git clone https://github.com/srithika22/EventHub-MERN.git
   cd EventHub-MERN
   ```

2. Backend (API)
   ```bash
   cd backend
   npm install
   # copy .env.example if present, or create .env
   cp .env.example .env || true
   # run (use nodemon in dev if configured)
   npm run dev
   ```
   Typical backend dev URL: http://localhost:5000 (or the PORT set in your .env)

3. Frontend (React)
   ```bash
   cd ../frontend
   npm install
   # Vite: usually `npm run dev` — if using CRA, use `npm start`
   npm run dev
   ```
   Typical frontend dev URL: http://localhost:5173 (Vite) or http://localhost:3000 (CRA)

If your backend entry lives in `server/`, replace `backend` with `server` in the commands above.

---

## Environment variables

Create a `.env` in your backend folder with at least:

- MONGO_URI=your_mongodb_connection_string
- JWT_SECRET=your_jwt_secret
- PORT=5000
- CLIENT_URL=http://localhost:5173

Frontend (Vite) may expect:
- VITE_API_BASE_URL=http://localhost:5000

If the frontend uses CRA:
- REACT_APP_API_BASE_URL=http://localhost:5000

Check `frontend/package.json`, `frontend/vite.config.js`, or code for the exact variable name the frontend expects.

---

## API Endpoints

(Click any link below to jump to the expanded description and examples for that endpoint.)

- [Auth endpoints](#auth-endpoints)  
  - [POST /api/auth/register](#post-api-auth-register)  
  - [POST /api/auth/login](#post-api-auth-login)

- [User endpoints](#user-endpoints)  
  - [GET /api/users/me](#get-api-usersme)  
  - [PUT /api/users/:id](#put-api-usersid)

- [Event endpoints](#event-endpoints)  
  - [GET /api/events](#get-api-events)  
  - [GET /api/events/:id](#get-api-eventsid)  
  - [POST /api/events](#post-api-events)  
  - [PUT /api/events/:id](#put-api-eventsid)  
  - [DELETE /api/events/:id](#delete-api-eventsid)

- [RSVP / Attendee endpoints](#rsvp--attendee-endpoints)  
  - [POST /api/events/:id/rsvp](#post-api-eventsidrsvp)  
  - [DELETE /api/events/:id/rsvp](#delete-api-eventsidrsvp)

Base URL
- Replace BASE_URL with your backend base URL when running examples:
  - Local dev example: http://localhost:5000
  - Production (if backend is mounted under same domain): https://eventhub-mern.vercel.app (verify your backend path)

---

### Auth endpoints

#### POST /api/auth/register
Create a new user.

Example cURL:
```bash
curl -X POST "BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"password123"}'
```

#### POST /api/auth/login
Authenticate and receive JWT token.

Example cURL:
```bash
curl -X POST "BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'
```

---

### User endpoints

#### GET /api/users/me
Get current authenticated user (requires Authorization header: Bearer <token>).

#### PUT /api/users/:id
Update user profile (protected, usually owner only).

---

### Event endpoints

#### GET /api/events
List all events.

Example cURL:
```bash
curl -X GET "BASE_URL/api/events" -H "Accept: application/json"
```

#### GET /api/events/:id
Get event details.

#### POST /api/events
Create a new event (protected).

#### PUT /api/events/:id
Update an event (protected, owner only).

#### DELETE /api/events/:id
Delete an event (protected, owner only).

---

### RSVP / Attendee endpoints

#### POST /api/events/:id/rsvp
RSVP to an event (protected).

#### DELETE /api/events/:id/rsvp
Remove RSVP (protected).

---

## Frontend routes

Common UI routes (React Router) — click to jump to these headings inside the app (client-side):

- / — Home / Discover events  
- /events — Events listing  
- /events/:id — Event details  
- /create — Create new event (protected)  
- /login — Login  
- /register — Register  
- /profile — User profile (protected)

---

## Testing

- If tests are configured:
  - Backend: from `backend/` run `npm test`
  - Frontend: from `frontend/` run `npm test`
- Manual testing tools: Postman, curl.

---

## License & Contact

- License: See LICENSE file in this repo.
- Author: srithika22 — https://github.com/srithika22

