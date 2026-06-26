"""SQLModel mapping ke skema yang dibuat oleh db/migrations/0001_init.sql.

Catatan: DDL kanonik = file SQL (punya trigger immutability & PostGIS yang tak
bisa di-autogenerate). Model di sini HANYA untuk query layer — kolom geografis
(geo/gps) sengaja tidak dipetakan supaya tak butuh geoalchemy2.
"""

import uuid
from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Organization(SQLModel, table=True):
    __tablename__ = "organization"
    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    name: str
    owner_user_id: Optional[uuid.UUID] = None


class AppUser(SQLModel, table=True):
    __tablename__ = "app_user"
    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    org_id: uuid.UUID
    name: str
    phone: str
    role: str
    is_active: bool = True


class Project(SQLModel, table=True):
    __tablename__ = "project"
    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    org_id: uuid.UUID
    name: str
    client_name: Optional[str] = None
    address_short: Optional[str] = None
    status: str = "active"
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None


class Site(SQLModel, table=True):
    __tablename__ = "site"
    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    org_id: uuid.UUID
    project_id: uuid.UUID
    name: str
    address: Optional[str] = None
    geo_radius_m: int = 150
    assigned_mandor_id: Optional[uuid.UUID] = None


class Target(SQLModel, table=True):
    __tablename__ = "target"
    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    org_id: uuid.UUID
    site_id: uuid.UUID
    title: str
    description: Optional[str] = None
    period_type: str = "daily"
    due_date: Optional[date] = None
    status: str = "pending"


class Issue(SQLModel, table=True):
    __tablename__ = "issue"
    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    org_id: uuid.UUID
    site_id: uuid.UUID
    reported_by: uuid.UUID
    issue_type: str
    urgency: str = "medium"
    description: Optional[str] = None
    status: str = "open"
    reported_server_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

class DailyReport(SQLModel, table=True):
    __tablename__ = "daily_report"
    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    org_id: uuid.UUID
    site_id: uuid.UUID
    mandor_id: uuid.UUID
    report_date: date
    target_id: Optional[uuid.UUID] = None
    work_done: Optional[str] = None
    target_status: str = "belum"
    worker_attendance: list = Field(default_factory=list, sa_column=Column(JSONB))
    submit_status: str = "draft"
    submitted_server_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

class AppSetting(SQLModel, table=True):
    __tablename__ = "app_setting"
    key: str = Field(primary_key=True)
    value: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class VisitorLog(SQLModel, table=True):
    __tablename__ = "visitor_log"
    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
class FinanceLog(SQLModel, table=True):
    __tablename__ = "finance_log"
    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    org_id: uuid.UUID
    project_id: uuid.UUID
    type: str = "in"  # 'in' or 'out'
    category: str
    amount: float = 0.0
    description: Optional[str] = None
    date: date
    recorded_by: uuid.UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
