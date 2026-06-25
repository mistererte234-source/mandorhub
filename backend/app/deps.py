import uuid

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from .core.db import get_session
from .core.security import decode_token
from .models import AppUser

bearer = HTTPBearer(auto_error=True)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    session: Session = Depends(get_session),
) -> AppUser:
    try:
        payload = decode_token(creds.credentials)
        user_id = uuid.UUID(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    user = session.get(AppUser, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User tidak ditemukan / nonaktif")
    return user
