from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..deps import get_session, get_current_user
from ..models import Issue
from ..schemas import IssueCreate, UserOut

router = APIRouter(prefix="/api/issues", tags=["Issues"])

@router.post("")
def create_issue(
    payload: IssueCreate,
    db: Session = Depends(get_session),
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.role != "mandor":
        raise HTTPException(status_code=403, detail="Hanya mandor yang bisa lapor masalah")

    issue = Issue(
        site_id=payload.site_id,
        org_id=current_user.org_id,
        issue_type=payload.issue_type,
        urgency=payload.urgency,
        description=payload.description,
        status="open",
        reported_by=current_user.id
    )

    db.add(issue)
    db.commit()
    return {"message": "Masalah berhasil dilaporkan", "issue_id": issue.id}

@router.patch("/{issue_id}/resolve")
def resolve_issue(
    issue_id: str,
    db: Session = Depends(get_session),
    current_user: UserOut = Depends(get_current_user),
):
    issue = db.query(Issue).filter(Issue.id == issue_id, Issue.org_id == current_user.org_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Masalah tidak ditemukan")
    
    import datetime
    issue.status = "resolved"
    issue.updated_at = datetime.datetime.utcnow()
    db.commit()
    return {"message": "Masalah berhasil diselesaikan"}
