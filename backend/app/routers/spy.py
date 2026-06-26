from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlmodel import Session
from typing import Optional
from pydantic import BaseModel

from ..core.db import get_session
from ..models import VisitorLog

router = APIRouter(prefix="/api/spy", tags=["spy"])

class SpyTrackIn(BaseModel):
    path: str
    user_agent: Optional[str] = None

def _record_visit(session: Session, ip: str, ua: str, path: str):
    log = VisitorLog(ip_address=ip, user_agent=ua, path=path)
    session.add(log)
    session.commit()

@router.post("/track")
def track_visitor(
    request: Request,
    body: SpyTrackIn,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    # Get IP address
    # If behind proxy (like Vercel/Render), look for x-forwarded-for
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
        
    ua = body.user_agent or request.headers.get("user-agent", "unknown")
    
    # Run DB insertion in background so it doesn't block the request response
    background_tasks.add_task(_record_visit, session, ip, ua, body.path)
    
    # Return 200 OK immediately silently
    return {"status": "ok"}
