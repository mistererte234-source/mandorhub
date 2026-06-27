from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlmodel import Session

from ..core.db import get_session
from ..deps import get_current_user
from ..models import AppUser, Issue
from ..schemas import DashboardOut, DashboardSummary, SiteStatus, IssueOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Gunakan project.mandor_id untuk filter mandor (tidak lagi dari site.assigned_mandor_id)
_STATUS_SQL = text(
    """
    SELECT
      s.id        AS site_id,
      p.id        AS project_id,
      p.name      AS project,
      s.name      AS name,
      m.name      AS mandor,
      (SELECT count(*) FROM issue i
         WHERE i.site_id = s.id AND i.status = 'open' AND i.deleted_at IS NULL) AS open_issues,
      EXISTS (SELECT 1 FROM issue i
         WHERE i.site_id = s.id AND i.status = 'open' AND i.urgency = 'high'
               AND i.deleted_at IS NULL) AS issue_high,
      EXISTS (SELECT 1 FROM target t
         WHERE t.site_id = s.id AND t.due_date < current_date AND t.status <> 'done'
               AND t.deleted_at IS NULL) AS target_overdue,
      EXISTS (SELECT 1 FROM daily_report r
         WHERE r.site_id = s.id AND r.report_date = current_date
               AND r.submit_status = 'submitted' AND r.deleted_at IS NULL) AS reported_today
    FROM site s
    JOIN project p ON p.id = s.project_id
    JOIN  app_user m ON m.id = p.mandor_id
    WHERE s.org_id = CAST(:org_id AS uuid)
      AND s.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND (CAST(:mandor_id AS uuid) IS NULL OR p.mandor_id = CAST(:mandor_id AS uuid))
      AND (CAST(:bos_id    AS uuid) IS NULL OR p.bos_id    = CAST(:bos_id    AS uuid))
      AND (CAST(:project_id AS uuid) IS NULL OR p.id       = CAST(:project_id AS uuid))
    ORDER BY p.name, s.name
    """
)


def _classify(row) -> tuple[str, str, list[str]]:
    reasons: list[str] = []
    if row["issue_high"]:
        reasons.append("Ada masalah mendesak menunggu keputusan")
    if row["target_overdue"]:
        reasons.append("Target lewat tenggat")
    if not row["reported_today"]:
        reasons.append("Belum lapor hari ini")
    if row["open_issues"] and not row["issue_high"]:
        reasons.append("Ada masalah menunggu keputusan")

    if row["issue_high"] or row["target_overdue"]:
        return "red", "Butuh perhatian", reasons
    if (not row["reported_today"]) or row["open_issues"]:
        return "yellow", "Perlu laporan", reasons
    return "green", "Aman", ["Sudah lapor, tidak ada masalah"]


from typing import Optional


@router.get("", response_model=DashboardOut)
def dashboard(
    project_id: Optional[str] = None,
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    mandor_id = str(user.id) if user.role == "mandor" else None
    bos_id    = str(user.id) if user.role == "contractor" else None

    rows = session.execute(
        _STATUS_SQL,
        {
            "org_id":     str(user.org_id),
            "mandor_id":  mandor_id,
            "bos_id":     bos_id,
            "project_id": project_id
        }
    ).mappings().all()

    site_ids = [row["site_id"] for row in rows]
    open_issues = []
    if site_ids:
        open_issues = session.query(Issue).filter(
            Issue.org_id == user.org_id,
            Issue.status == "open",
            Issue.deleted_at == None,
            Issue.site_id.in_(site_ids)
        ).all()

    issues_by_site: dict = {}
    for issue in open_issues:
        key = str(issue.site_id)
        issues_by_site.setdefault(key, []).append(
            IssueOut(
                id=issue.id,
                issue_type=issue.issue_type,
                description=issue.description or "",
                urgency=issue.urgency
            )
        )

    sites: list[SiteStatus] = []
    summary = DashboardSummary(total=0, green=0, yellow=0, red=0, not_reported_today=0, open_issues=0)

    for row in rows:
        status, label, reasons = _classify(row)
        site_id_str = str(row["site_id"])
        sites.append(
            SiteStatus(
                site_id=row["site_id"],
                project=row["project"],
                project_id=row["project_id"],
                name=row["name"],
                mandor=row["mandor"],
                status=status,
                status_label=label,
                reasons=reasons,
                open_issues=row["open_issues"],
                open_issue_list=issues_by_site.get(site_id_str, [])
            )
        )
        summary.total += 1
        setattr(summary, status, getattr(summary, status) + 1)
        if not row["reported_today"]:
            summary.not_reported_today += 1
        summary.open_issues += row["open_issues"]

    return DashboardOut(summary=summary, sites=sites)
