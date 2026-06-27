import uuid
import datetime
from typing import Any, Optional

from pydantic import BaseModel


# ---------- Auth ----------
class RequestOtpIn(BaseModel):
    phone: str


class RequestOtpOut(BaseModel):
    sent: bool
    dev_code: Optional[str] = None


class VerifyOtpIn(BaseModel):
    phone: str
    code: str


class LoginAdminIn(BaseModel):
    password: str


class PasswordUpdateIn(BaseModel):
    new_password: str


# ---------- Visitor / Spy ----------
class VisitorLogOut(BaseModel):
    id: uuid.UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    path: Optional[str] = None
    created_at: str          # formatted WIB
    device_type: Optional[str] = None
    os: Optional[str] = None
    browser: Optional[str] = None
    city: Optional[str] = None
    isp: Optional[str] = None


# ---------- Users ----------
class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    role: str
    org_id: uuid.UUID
    phone: Optional[str] = None


class UserUpdateIn(BaseModel):
    phone: Optional[str] = None
    name: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Projects (Admin) ----------
class PersonCreate(BaseModel):
    """Data untuk membuat satu user baru (Bos / Mandor / Bendahara)."""
    name: str
    phone: str


class AdminProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    client_name: Optional[str] = None
    status: str
    bos_id: uuid.UUID
    bos_name: str
    bos_phone: Optional[str] = None
    mandor_id: uuid.UUID
    mandor_name: str
    mandor_phone: Optional[str] = None
    bendahara_id: Optional[uuid.UUID] = None
    bendahara_name: Optional[str] = None
    bendahara_phone: Optional[str] = None


class AdminProjectCreate(BaseModel):
    """Buat proyek baru sekaligus buat Bos, Mandor, dan Bendahara (opsional)."""
    name: str
    client_name: Optional[str] = None
    bos: PersonCreate
    mandor: PersonCreate
    bendahara: Optional[PersonCreate] = None   # None = tidak ada bendahara


class AdminProjectPatch(BaseModel):
    bos_id: Optional[uuid.UUID] = None
    mandor_id: Optional[uuid.UUID] = None
    bendahara_id: Optional[uuid.UUID] = None   # kirim None untuk hapus
    name: Optional[str] = None
    client_name: Optional[str] = None
    status: Optional[str] = None
    tukang_daily_rate: Optional[float] = None
    kuli_daily_rate: Optional[float] = None
    progress_percent: float = 0.0


# ---------- Projects (User) ----------
class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    client_name: Optional[str] = None
    status: str
    bos_name: Optional[str] = None
    mandor_name: Optional[str] = None
    bendahara_name: Optional[str] = None
    tukang_daily_rate: float = 0.0
    kuli_daily_rate: float = 0.0
    progress_percent: float = 0.0


# ---------- Dashboard ----------
class IssueOut(BaseModel):
    id: uuid.UUID
    issue_type: str
    description: str
    urgency: str


class SiteStatus(BaseModel):
    site_id: uuid.UUID
    project: str
    project_id: uuid.UUID
    name: str
    mandor: Optional[str] = None
    status: str           # green | yellow | red
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
    target_status: Optional[str] = "belum"
    worker_attendance: list[WorkerAttendanceItem] = []
    report_date: Optional[datetime.date] = None


class ReportUpdate(BaseModel):
    work_done: Optional[str] = None
    report_date: Optional[datetime.date] = None
    worker_attendance: list[WorkerAttendanceItem] = []


# ---------- Issues ----------
class IssueCreate(BaseModel):
    site_id: uuid.UUID
    issue_type: str
    urgency: str = "high"
    description: str


# ---------- Site / Timeline ----------
class TimelineItem(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    description: str
    timestamp: datetime.datetime
    data: Optional[Any] = None


class SiteDetailOut(BaseModel):
    site_id: uuid.UUID
    project: str
    project_id: uuid.UUID
    name: str
    timeline: list[TimelineItem]


# ---------- Finance ----------
class FinanceCreate(BaseModel):
    project_id: uuid.UUID
    type: str   # "in" or "out"
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
