import uuid
from typing import Optional

from pydantic import BaseModel


# ---------- Auth ----------
class RequestOtpIn(BaseModel):
    phone: str


class RequestOtpOut(BaseModel):
    sent: bool
    # Hanya terisi saat OTP_DEV_MODE=true.
    dev_code: Optional[str] = None


class VerifyOtpIn(BaseModel):
    phone: str
    code: str

class LoginAdminIn(BaseModel):
    password: str

class PasswordUpdateIn(BaseModel):
    new_password: str

class VisitorLogOut(BaseModel):
    id: uuid.UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    path: Optional[str] = None
    created_at: str # formatted time

class AdminProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    client_name: Optional[str] = None
    status: str
    bos_name: Optional[str] = None
    mandor_name: Optional[str] = None

class AdminProjectCreate(BaseModel):
    name: str
    client_name: Optional[str] = None
    bos_id: uuid.UUID
    mandor_id: uuid.UUID


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    client_name: Optional[str] = None
    status: str
    
class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    role: str
    org_id: uuid.UUID


class UserUpdateIn(BaseModel):
    phone: Optional[str] = None
    name: Optional[str] = None

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class IssueOut(BaseModel):
    id: uuid.UUID
    issue_type: str
    description: str
    urgency: str

class SiteStatus(BaseModel):
    site_id: uuid.UUID
    project: str
    name: str
    mandor: Optional[str] = None
    status: str  # green | yellow | red
    status_label: str
    reasons: list[str]
    open_issues: int
    open_issue_list: list[IssueOut] = []


class DashboardSummary(BaseModel):
    total: int
    green: int
    yellow: int
    red: int
    not_reported_today: int
    open_issues: int


class DashboardOut(BaseModel):
    summary: DashboardSummary
    sites: list[SiteStatus]


# ---------- Reports ----------
class WorkerAttendanceItem(BaseModel):
    role: str
    count: int
    names: Optional[str] = None

class ReportCreate(BaseModel):
    site_id: uuid.UUID
    target_id: Optional[uuid.UUID] = None
    work_done: Optional[str] = None
    target_status: Optional[str] = "belum"  # "tercapai" atau "belum"
    worker_attendance: list[WorkerAttendanceItem] = []

class ReportUpdate(BaseModel):
    work_done: Optional[str] = None
    worker_attendance: list[WorkerAttendanceItem] = []

# ---------- Issues ----------
class IssueCreate(BaseModel):
    site_id: uuid.UUID
    issue_type: str
    urgency: str = "high"
    description: str

# ---------- Site / Timeline ----------
import datetime
from typing import Any

class TimelineItem(BaseModel):
    id: uuid.UUID
    type: str  # "report", "issue_open", "issue_resolved"
    title: str
    description: str
    timestamp: datetime.datetime
    data: Optional[Any] = None

class SiteDetailOut(BaseModel):
    site_id: uuid.UUID
    project: str
    name: str
    timeline: list[TimelineItem]

class FinanceCreate(BaseModel):
    project_id: uuid.UUID
    type: str  # "in" or "out"
    category: str
    amount: float
    description: Optional[str] = None
    date: datetime.date

class FinanceOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    type: str
    category: str
    amount: float
    description: Optional[str] = None
    date: datetime.date
    recorded_by: uuid.UUID
