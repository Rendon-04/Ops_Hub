import pytest
from datetime import date, timedelta
from urllib.parse import urlparse, parse_qs
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User  
from app.models.workspace import Workspace
from app.models.vendor import Vendor  
from app.models.inventory_item import InventoryItem  
from app.models.maintenance_task import MaintenanceTask  
from app.models.shift_note import ShiftNote
from app.models.document import Document
from app.api.routers.document_routes import STORAGE_DIR


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
def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def mock_google_login(monkeypatch, email: str, sub: str = "sub-1", name: str = "Test User", verified: bool = True, hd: str = "neon.work"):
    from app.auth import google as google_auth

    def fake_exchange_code(_code: str):
        return {"id_token": "fake-id-token"}

    def fake_verify(_id_token: str):
        return {
            "email": email,
            "email_verified": verified,
            "sub": sub,
            "name": name,
            "hd": hd,
        }

    monkeypatch.setattr(google_auth, "exchange_code_for_tokens", fake_exchange_code)
    monkeypatch.setattr(google_auth, "verify_google_id_token", fake_verify)


def google_login(client: TestClient, monkeypatch, email: str, sub: str = "sub-1"):
    mock_google_login(monkeypatch, email=email, sub=sub)
    res = client.get("/auth/google/callback?code=fake", follow_redirects=False)
    assert res.status_code in (302, 307), res.text
    location = res.headers.get("location", "")
    token = parse_qs(urlparse(location).query).get("token", [""])[0]
    assert token
    return token


# -----------------------------
# Tests
# -----------------------------
def test_google_login_rejects_non_domain(client: TestClient, monkeypatch):
    mock_google_login(monkeypatch, email="user@example.com")
    r = client.get("/auth/google/callback?code=fake", follow_redirects=False)
    assert r.status_code == 403


def test_google_login_creates_workspace_and_user(client: TestClient, db_session, monkeypatch):
    token = google_login(client, monkeypatch, "user@neon.work", sub="sub-abc")
    assert token

    user = db_session.query(User).filter(User.email == "user@neon.work").first()
    assert user is not None
    assert user.workspace_id is not None
    workspace = db_session.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    assert workspace is not None
    assert workspace.name == "Neon Spaces"


def test_workspace_scoping_isolated(client: TestClient, db_session, monkeypatch):
    token_a = google_login(client, monkeypatch, "alpha@neon.work", sub="sub-a")
    headers_a = auth_headers(token_a)

    r = client.post("/vendors/", json={"name": "Vendor A"}, headers=headers_a)
    assert r.status_code == 200

    workspace_b = Workspace(name="Other Workspace")
    db_session.add(workspace_b)
    db_session.commit()
    db_session.refresh(workspace_b)

    user_b = User(
        email="bravo@neon.work",
        workspace_id=workspace_b.id,
        role="member",
    )
    db_session.add(user_b)
    db_session.commit()
    db_session.refresh(user_b)

    from app.auth.security import create_access_token

    token_b = create_access_token({"user_id": user_b.id})
    headers_b = auth_headers(token_b)

    r = client.get("/vendors/", headers=headers_b)
    assert r.status_code == 200
    assert r.json() == []


def test_vendor_crud_and_ownership(client: TestClient, monkeypatch):
    token_a = google_login(client, monkeypatch, "a@neon.work", sub="sub-a")
    headers_a = auth_headers(token_a)

    # create vendor
    r = client.post(
        "/vendors/",
        json={"name": "Vendor A", "email": "va@test.com", "phone": "111"},
        headers=headers_a,
    )
    assert r.status_code == 200, r.text
    vendor_a = r.json()
    vendor_id = vendor_a["id"]

    # list vendors (should contain 1)
    r = client.get("/vendors/", headers=headers_a)
    assert r.status_code == 200
    assert len(r.json()) == 1

    # get vendor
    r = client.get(f"/vendors/{vendor_id}", headers=headers_a)
    assert r.status_code == 200
    assert r.json()["name"] == "Vendor A"

    # update vendor
    r = client.put(
        f"/vendors/{vendor_id}",
        json={"phone": "222"},
        headers=headers_a,
    )
    assert r.status_code == 200
    assert r.json()["phone"] == "222"

    token_b = google_login(client, monkeypatch, "b@neon.work", sub="sub-b")
    headers_b = auth_headers(token_b)

    r = client.get(f"/vendors/{vendor_id}", headers=headers_b)
    assert r.status_code == 200

    # delete vendor as B (shared workspace)
    r = client.delete(f"/vendors/{vendor_id}", headers=headers_b)
    assert r.status_code == 200
    assert r.json()["message"].lower().startswith("vendor")


def test_inventory_crud_low_stock_and_vendor_validation(client: TestClient, monkeypatch):
    token_a = google_login(client, monkeypatch, "a@neon.work", sub="sub-a")
    headers_a = auth_headers(token_a)

    # create vendor A
    r = client.post(
        "/vendors/",
        json={"name": "Vendor A"},
        headers=headers_a,
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
        headers=headers_a,
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
    r = client.get("/inventory/", headers=headers_a)
    assert r.status_code == 200
    assert len(r.json()) == 1

    # get item
    r = client.get(f"/inventory/{item_id}", headers=headers_a)
    assert r.status_code == 200
    assert r.json()["name"] == "Printer Paper"

    # update item -> quantity 20 
    r = client.put(
        f"/inventory/{item_id}",
        json={"quantity": 20},
        headers=headers_a,
    )
    assert r.status_code == 200
    assert r.json()["is_low_stock"] is False
    assert r.json()["status"] == "In Stock"

    # low-stock endpoint should now be empty
    r = client.get("/inventory/low-stock", headers=headers_a)
    assert r.status_code == 200
    assert r.json() == []

    # create another item that IS low stock
    r = client.post(
        "/inventory/",
        json={"name": "Gloves", "quantity": 1, "reorder_threshold": 5},
        headers=headers_a,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "Low"

    r = client.get("/inventory/low-stock", headers=headers_a)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Gloves"

    # create out-of-stock item
    r = client.post(
        "/inventory/",
        json={"name": "Coffee Pods", "quantity": 0, "reorder_threshold": 10},
        headers=headers_a,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "Out"

    # shared workspace: user B can see items
    token_b = google_login(client, monkeypatch, "b@neon.work", sub="sub-b")
    headers_b = auth_headers(token_b)

    r = client.get(f"/inventory/{item_id}", headers=headers_b)
    assert r.status_code == 200

    r = client.post(
        "/inventory/",
        json={"name": "Extra Item", "quantity": 1, "reorder_threshold": 1, "vendor_id": vendor_a_id},
        headers=headers_b,
    )
    assert r.status_code == 200

    # weekly inventory check
    r = client.post(f"/inventory/{item_id}/check", headers=headers_a)
    assert r.status_code == 200
    assert r.json()["last_checked_at"] is not None

    r = client.post("/inventory/check", headers=headers_a)
    assert r.status_code == 200
    assert r.json()["checked_count"] >= 1


def test_maintenance_crud_upcoming_and_ownership(client: TestClient, monkeypatch):
    token_a = google_login(client, monkeypatch, "a@neon.work", sub="sub-a")
    headers_a = auth_headers(token_a)

    # create inventory item A
    r = client.post(
        "/inventory/",
        json={"name": "HVAC Filter", "quantity": 2, "reorder_threshold": 2},
        headers=headers_a,
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
        headers=headers_a,
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
        headers=headers_a,
    )
    assert r.status_code == 200

    r = client.get("/maintenance/upcoming?days=7", headers=headers_a)
    assert r.status_code == 200, r.text
    upcoming = r.json()
    assert len(upcoming) == 1
    assert upcoming[0]["title"] == "Replace filter"

    # mark first task as completed
    r = client.put(
        f"/maintenance/{task_id}",
        json={"status": "CLOSED"},
        headers=headers_a,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "CLOSED"

    r = client.get("/maintenance/upcoming?days=7", headers=headers_a)
    assert r.status_code == 200
    assert r.json() == []

    token_b = google_login(client, monkeypatch, "b@neon.work", sub="sub-b")
    r = client.delete(f"/maintenance/{task_id}", headers=auth_headers(token_b))
    assert r.status_code == 200


def test_dashboard_summary_counts(client: TestClient, monkeypatch):
    token_a = google_login(client, monkeypatch, "a@neon.work", sub="sub-a")
    headers_a = auth_headers(token_a)

    # create 2 inventory items (1 low-stock)
    r = client.post(
        "/inventory/",
        json={"name": "Item 1", "quantity": 1, "reorder_threshold": 5},
        headers=headers_a,
    )
    assert r.status_code == 200
    item1_id = r.json()["id"]

    r = client.post(
        "/inventory/",
        json={"name": "Item 2", "quantity": 10, "reorder_threshold": 2},
        headers=headers_a,
    )
    assert r.status_code == 200

    # create 1 open maintenance task (OPEN)
    due = date.today() + timedelta(days=2)
    r = client.post(
        "/maintenance/",
        json={"inventory_item_id": item1_id, "title": "Check Item 1", "due_date": str(due), "status": "OPEN"},
        headers=headers_a,
    )
    assert r.status_code == 200

    # summary endpoint
    r = client.get("/dashboard/summary", headers=headers_a)
    assert r.status_code == 200, r.text
    data = r.json()

    assert data["total_items"] == 2
    assert data["low_stock_count"] == 1
    assert data["open_tasks_count"] == 1

    token_b = google_login(client, monkeypatch, "b@neon.work", sub="sub-b")
    r = client.get("/dashboard/summary", headers=auth_headers(token_b))
    assert r.status_code == 200
    data_b = r.json()
    assert data_b["total_items"] == 2
    assert data_b["low_stock_count"] == 1
    assert data_b["open_tasks_count"] == 1


def test_shift_notes_upsert_and_validation(client: TestClient, monkeypatch):
    token_a = google_login(client, monkeypatch, "a@neon.work", sub="sub-a")

    today = date.today().isoformat()

    r = client.put(
        "/api/shift-notes",
        json={"note_date": today, "shift_type": "opening", "content": "Morning check complete"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200, r.text
    assert r.json()["opening"]["content"] == "Morning check complete"

    r = client.put(
        "/api/shift-notes",
        json={"note_date": today, "shift_type": "opening", "content": "Updated opening note"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    assert r.json()["opening"]["content"] == "Updated opening note"

    r = client.put(
        "/api/shift-notes",
        json={"note_date": today, "shift_type": "midday", "content": "Bad type"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 400

    r = client.put(
        "/api/shift-notes",
        json={"note_date": today, "shift_type": "closing", "content": "   "},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 400


def test_documents_admin_upload_and_delete(client: TestClient, db_session, monkeypatch):
    admin_token = google_login(client, monkeypatch, "admin@neon.work", sub="sub-admin")
    user_token = google_login(client, monkeypatch, "user@neon.work", sub="sub-user")

    file_payload = {
        "file": ("opening.pdf", b"test content", "application/pdf"),
    }
    data_payload = {
        "title": "Opening Procedures",
        "category": "opening",
        "description": "Store opening checklist",
        "is_pinned": "true",
    }

    r = client.post(
        "/api/documents",
        data=data_payload,
        files=file_payload,
        headers=auth_headers(user_token),
    )
    assert r.status_code == 403

    r = client.post(
        "/api/documents",
        data=data_payload,
        files=file_payload,
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 200, r.text
    doc_id = r.json()["id"]

    doc = db_session.query(Document).filter(Document.id == doc_id).first()
    assert doc is not None
    file_path = STORAGE_DIR / doc.stored_filename
    assert file_path.exists()

    r = client.put(
        f"/api/documents/{doc_id}",
        json={"title": "Updated title"},
        headers=auth_headers(user_token),
    )
    assert r.status_code == 403

    r = client.delete(
        f"/api/documents/{doc_id}",
        headers=auth_headers(user_token),
    )
    assert r.status_code == 403

    r = client.delete(
        f"/api/documents/{doc_id}",
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 200
    assert not file_path.exists()


def test_documents_download_missing(client: TestClient, monkeypatch):
    admin_token = google_login(client, monkeypatch, "admin@neon.work", sub="sub-admin")
    r = client.get("/api/documents/9999/download", headers=auth_headers(admin_token))
    assert r.status_code == 404
