from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlmodel import Session

from ..core.db import get_session
from ..deps import get_current_user
from ..models import AppUser, Issue
from ..schemas import DashboardOut, DashboardSummary, SiteStatus, IssueOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Status di-derive on-the-fly (tidak disimpan). Cast eksplisit ke uuid supaya
# Postgres tidak bingung tipe parameter saat :mandor_id bernilai NULL.
_STATUS_SQL = text(
    """
    SELECT
      s.id   AS site_id,
      p.name AS project,
      s.name AS name,
      u.name AS mandor,
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
    LEFT JOIN app_user u ON u.id = s.assigned_mandor_id
    WHERE s.org_id = CAST(:org_id AS uuid)
      AND s.deleted_at IS NULL
      AND (CAST(:mandor_id AS uuid) IS NULL OR s.assigned_mandor_id = CAST(:mandor_id AS uuid))
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


@router.get("", response_model=DashboardOut)
def dashboard(
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Mandor hanya lihat titik yang ditugaskan; kontraktor/admin lihat semua.
    mandor_id = str(user.id) if user.role == "mandor" else None
    rows = session.execute(
        _STATUS_SQL, {"org_id": str(user.org_id), "mandor_id": mandor_id}
    ).mappings().all()

    # Get all open issues for this org
    open_issues = session.query(Issue).filter(Issue.org_id == user.org_id, Issue.status == 'open', Issue.deleted_at == None).all()
    issues_by_site = {}
    for issue in open_issues:
        site_id_str = str(issue.site_id)
        if site_id_str not in issues_by_site:
            issues_by_site[site_id_str] = []
        issues_by_site[site_id_str].append(
            IssueOut(
                id=issue.id,
                issue_type=issue.issue_type,
                description=issue.description or "",
                urgency=issue.urgency
            )
        )

    sites: list[SiteStatus] = []
    summary = DashboardSummary(
        total=0, green=0, yellow=0, red=0, not_reported_today=0, open_issues=0
    )

    for row in rows:
        status, label, reasons = _classify(row)
        site_id_str = str(row["site_id"])
        sites.append(
            SiteStatus(
                site_id=row["site_id"],
                project=row["project"],
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
