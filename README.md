# OpsHub

OpsHub is a **full-stack operations management app** for tracking vendors, inventory, and maintenance tasks in one place.
## Demo

**Walkthrough of OpsHub**
  
[![OpsHub Demo](demo/opshub-thumbnail.png)](
https://github.com/Rendon-04/Ops_Hub/blob/main/demo/opshub-demo.mp4
)

It’s designed as a clean, production-style MVP that mirrors how internal ops tools are built at real companies.

* **Backend:** FastAPI + SQLAlchemy + JWT authentication
* **Frontend:** React + Vite
* **Database:** PostgreSQL (local dev) or SQLite (tests)

---

## What You Can Do With OpsHub

* Create an account and log in securely (JWT auth)
* Manage **vendors** (CRUD)
* Manage **inventory items** (CRUD + low-stock view)
* Track **maintenance tasks** (CRUD + upcoming tasks)
* View dashboard summary counts
* Run backend tests and frontend smoke tests

---

## Tech Stack

### Backend

* FastAPI
* SQLAlchemy
* JWT authentication
* PostgreSQL (local)
* SQLite (tests)
* Pytest

### Frontend

* React
* Vite
* TypeScript

---

## Project Structure

```
OpsHub/
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app entrypoint
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routes/        # API routes
│   │   ├── core/          # auth, config, security
│   │   └── db/            # database setup
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/
│   │   └── main.tsx
│   ├── cypress/
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## Getting Started (Local Setup)

These steps assume **macOS/Linux** and **Node + Python installed**.

You should be able to get everything running in **~10 minutes**.

---

## Clone the Repo

```
git clone https://github.com/Rendon-04/Ops_Hub.git
cd Ops_Hub
```

---

## Backend Setup

### Prerequisites

* Python **3.10+**
* PostgreSQL running locally
  *(or you can skip Postgres and just run tests)*

---

### Create a Virtual Environment

```
python3 -m venv .venv
source .venv/bin/activate
```

---

### Install Backend Dependencies

```
pip install -r backend/requirements.txt
```

---

### Environment Variables

Create a `.env` file inside `backend/`:

```
backend/.env
```

Example contents:

```
DATABASE_URL=postgresql://user:password@localhost:5432/ops_hub
SECRET_KEY=change_me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OAUTH_TOKEN_URL=/auth/login
```

> **Important:** These values are for local development only.

---

### Run the Backend API

```
uvicorn app.main:app --reload --app-dir backend
```

You should see:

```
Uvicorn running on http://127.0.0.1:8000
```

FastAPI docs available at:

```
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

### Install Frontend Dependencies

```
npm --prefix frontend install
```

---

### Environment Variables

Create:

```
frontend/.env
```

With:

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

### Run the Frontend App

```
npm --prefix frontend run dev
```

You should see output like:

```
Local: http://localhost:5173
```

Open that URL in your browser 

---

## Verifying Everything Works

### Quick Manual Test

1. Open the frontend
2. Sign up for a new account
3. Log in
4. Create:

   * A vendor
   * An inventory item
   * A maintenance task
5. Confirm dashboard counts update

If that works — you’re fully set up.

---

## Backend Tests

Tests run using **SQLite**, so you don’t need Postgres running.

```
DATABASE_URL=sqlite:///./test.db PYTHONPATH=. pytest -q
```

---

## API Routes (High-Level)

### Auth

* `POST /auth/signup`
* `POST /auth/login`

### Dashboard

* `GET /dashboard/summary`

### Vendors

* `GET /vendors`
* `POST /vendors`
* `GET /vendors/{vendor_id}`
* `PUT /vendors/{vendor_id}`
* `DELETE /vendors/{vendor_id}`

### Inventory

* `GET /inventory`
* `POST /inventory`
* `GET /inventory/{item_id}`
* `PUT /inventory/{item_id}`
* `DELETE /inventory/{item_id}`
* `GET /inventory/low-stock`

### Maintenance

* `GET /maintenance`
* `POST /maintenance`
* `GET /maintenance/{task_id}`
* `PUT /maintenance/{task_id}`
* `DELETE /maintenance/{task_id}`
* `GET /maintenance/upcoming?days=7`

---

## Notes & Design Decisions

* Database tables are created automatically on app startup
* JWT tokens are stored client-side
* Backend and frontend are fully decoupled
* Tests are intentionally simple and smoke-level
* This project prioritizes **clarity and maintainability over complexity**

---

## Future Improvements

* Role-based access control
* Pagination and filtering
* Docker support
* Deployment guides
* Audit logs
