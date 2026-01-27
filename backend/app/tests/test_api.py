import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User  
from app.models.vendor import Vendor  
from app.models.inventory_item import InventoryItem  
from app.models.maintenance_task import MaintenanceTask  


# -----------------------------
# Test database setup (SQLite)
# -----------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


# -----------------------------
# Helpers
# -----------------------------
def signup(client: TestClient, email: str, password: str):
    return client.post("/auth/signup", json={"email": email, "password": password})


def login_get_token(client: TestClient, email: str, password: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    return data["access_token"]


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


# -----------------------------
# Tests
# -----------------------------
def test_auth_signup_and_login(client: TestClient):
    r = signup(client, "a@test.com", "password123")
    assert r.status_code == 200, r.text

    token = login_get_token(client, "a@test.com", "password123")
    assert isinstance(token, str)
    assert len(token) > 20


def test_vendor_crud_and_ownership(client: TestClient):
    # user A
    signup(client, "a@test.com", "password123")
    token_a = login_get_token(client, "a@test.com", "password123")

    # create vendor
    r = client.post(
        "/vendors/",
        json={"name": "Vendor A", "email": "va@test.com", "phone": "111"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200, r.text
    vendor_a = r.json()
    vendor_id = vendor_a["id"]

    # list vendors (should contain 1)
    r = client.get("/vendors/", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert len(r.json()) == 1

    # get vendor
    r = client.get(f"/vendors/{vendor_id}", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json()["name"] == "Vendor A"

    # update vendor
    r = client.put(
        f"/vendors/{vendor_id}",
        json={"phone": "222"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    assert r.json()["phone"] == "222"

    # user B should NOT see A's vendor
    signup(client, "b@test.com", "password123")
    token_b = login_get_token(client, "b@test.com", "password123")

    r = client.get(f"/vendors/{vendor_id}", headers=auth_headers(token_b))
    assert r.status_code == 404 

    # delete vendor as A
    r = client.delete(f"/vendors/{vendor_id}", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json()["message"].lower().startswith("vendor")


def test_inventory_crud_low_stock_and_vendor_validation(client: TestClient):
    # user A setup
    signup(client, "a@test.com", "password123")
    token_a = login_get_token(client, "a@test.com", "password123")

    # create vendor A
    r = client.post(
        "/vendors/",
        json={"name": "Vendor A"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    vendor_a_id = r.json()["id"]

    # create inventory item with vendor
    r = client.post(
        "/inventory/",
        json={
            "name": "Printer Paper",
            "category": "Office and tech items",
            "quantity": 5,
            "reorder_threshold": 10,
            "reorder_url": "https://example.com/reorder/paper",
            "notes": "Restock monthly",
            "vendor_id": vendor_a_id,
        },
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200, r.text
    item = r.json()
    item_id = item["id"]
    assert item["is_low_stock"] is True
    assert item["status"] == "Low"
    assert item["category"] == "Office and tech items"
    assert item["reorder_url"] == "https://example.com/reorder/paper"
    assert item["notes"] == "Restock monthly"
    assert item["vendor_id"] == vendor_a_id

    # list inventory
    r = client.get("/inventory/", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert len(r.json()) == 1

    # get item
    r = client.get(f"/inventory/{item_id}", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json()["name"] == "Printer Paper"

    # update item -> quantity 20 
    r = client.put(
        f"/inventory/{item_id}",
        json={"quantity": 20},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    assert r.json()["is_low_stock"] is False
    assert r.json()["status"] == "In Stock"

    # low-stock endpoint should now be empty
    r = client.get("/inventory/low-stock", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json() == []

    # create another item that IS low stock
    r = client.post(
        "/inventory/",
        json={"name": "Gloves", "quantity": 1, "reorder_threshold": 5},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "Low"

    r = client.get("/inventory/low-stock", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Gloves"

    # create out-of-stock item
    r = client.post(
        "/inventory/",
        json={"name": "Coffee Pods", "quantity": 0, "reorder_threshold": 10},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "Out"

    # ownership check: user B cannot see A's item
    signup(client, "b@test.com", "password123")
    token_b = login_get_token(client, "b@test.com", "password123")

    r = client.get(f"/inventory/{item_id}", headers=auth_headers(token_b))
    assert r.status_code == 404

    # vendor assignment validation check:
    r = client.post(
        "/inventory/",
        json={"name": "Bad Item", "quantity": 1, "reorder_threshold": 1, "vendor_id": vendor_a_id},
        headers=auth_headers(token_b),
    )
    assert r.status_code == 400
    assert "vendor_id" in r.json()["detail"]

    # weekly inventory check
    r = client.post(f"/inventory/{item_id}/check", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json()["last_checked_at"] is not None

    r = client.post("/inventory/check", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json()["checked_count"] >= 1


def test_maintenance_crud_upcoming_and_ownership(client: TestClient):
    # user A setup
    signup(client, "a@test.com", "password123")
    token_a = login_get_token(client, "a@test.com", "password123")

    # create inventory item A
    r = client.post(
        "/inventory/",
        json={"name": "HVAC Filter", "quantity": 2, "reorder_threshold": 2},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    item_a_id = r.json()["id"]

    # create maintenance task due in 3 days 
    due_3 = date.today() + timedelta(days=3)
    r = client.post(
        "/maintenance/",
        json={
            "inventory_item_id": item_a_id,
            "title": "Replace filter",
            "due_date": str(due_3),
            "is_high_priority": True,
            "notes": "Urgent",
            "status": "OPEN",
        },
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200, r.text
    task = r.json()
    task_id = task["id"]
    assert task["status"] == "OPEN"
    assert task["is_high_priority"] is True

    # create maintenance task due in 30 days 
    due_30 = date.today() + timedelta(days=30)
    r = client.post(
        "/maintenance/",
        json={
            "inventory_item_id": item_a_id,
            "title": "Deep service",
            "due_date": str(due_30),
            "status": "IN_PROGRESS",
        },
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200

    r = client.get("/maintenance/upcoming?days=7", headers=auth_headers(token_a))
    assert r.status_code == 200, r.text
    upcoming = r.json()
    assert len(upcoming) == 1
    assert upcoming[0]["title"] == "Replace filter"

    # mark first task as completed
    r = client.put(
        f"/maintenance/{task_id}",
        json={"status": "CLOSED"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "CLOSED"

    r = client.get("/maintenance/upcoming?days=7", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json() == []

    signup(client, "b@test.com", "password123")
    token_b = login_get_token(client, "b@test.com", "password123")

    r = client.delete(f"/maintenance/{task_id}", headers=auth_headers(token_b))
    assert r.status_code == 404


def test_dashboard_summary_counts(client: TestClient):
    # user A setup
    signup(client, "a@test.com", "password123")
    token_a = login_get_token(client, "a@test.com", "password123")

    # create 2 inventory items (1 low-stock)
    r = client.post(
        "/inventory/",
        json={"name": "Item 1", "quantity": 1, "reorder_threshold": 5},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    item1_id = r.json()["id"]

    r = client.post(
        "/inventory/",
        json={"name": "Item 2", "quantity": 10, "reorder_threshold": 2},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200

    # create 1 open maintenance task (OPEN)
    due = date.today() + timedelta(days=2)
    r = client.post(
        "/maintenance/",
        json={"inventory_item_id": item1_id, "title": "Check Item 1", "due_date": str(due), "status": "OPEN"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200

    # summary endpoint
    r = client.get("/dashboard/summary", headers=auth_headers(token_a))
    assert r.status_code == 200, r.text
    data = r.json()

    assert data["total_items"] == 2
    assert data["low_stock_count"] == 1
    assert data["open_tasks_count"] == 1

    signup(client, "b@test.com", "password123")
    token_b = login_get_token(client, "b@test.com", "password123")

    r = client.get("/dashboard/summary", headers=auth_headers(token_b))
    assert r.status_code == 200
    data_b = r.json()
    assert data_b["total_items"] == 0
    assert data_b["low_stock_count"] == 0
    assert data_b["open_tasks_count"] == 0
