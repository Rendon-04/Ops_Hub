from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()


from app.db.base import Base
from app.db.session import engine

import app.models  

from app.api.routers import (
    auth_routes,
    vendor_routes,
    inventory_routes,
    maintenance_routes,
    dashboard_routes,
    incident_routes,
)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(vendor_routes.router)
app.include_router(inventory_routes.router)
app.include_router(maintenance_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(incident_routes.incidents_router)
app.include_router(incident_routes.incident_attachments_router)
app.include_router(incident_routes.attachments_router)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def health_check():
    return {"status": "ok"}
