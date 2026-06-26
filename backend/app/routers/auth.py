from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..core.config import settings
from ..core.db import get_session
from ..core.security import create_access_token
from ..models import AppUser
from ..schemas import RequestOtpIn, RequestOtpOut, TokenOut, UserOut, VerifyOtpIn
from ..services import otp

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/request-otp", response_model=RequestOtpOut)
def request_otp(body: RequestOtpIn, session: Session = Depends(get_session)):
    user = session.exec(
        select(AppUser).where(AppUser.phone == body.phone, AppUser.is_active == True)  # noqa: E712
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Nomor belum terdaftar")

    code = otp.generate(body.phone)
    # TODO(prod): kirim `code` via WhatsApp/SMS provider, jangan dikembalikan.
    return RequestOtpOut(sent=True, dev_code=code if settings.otp_dev_mode else None)


@router.post("/verify-otp", response_model=TokenOut)
def verify_otp(body: VerifyOtpIn, session: Session = Depends(get_session)):
    if not otp.verify(body.phone, body.code):
        raise HTTPException(status_code=401, detail="Kode OTP salah atau kedaluwarsa")

    user = session.exec(select(AppUser).where(AppUser.phone == body.phone)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    token = create_access_token(str(user.id), user.role, str(user.org_id))
    return TokenOut(
        access_token=token,
        user=UserOut(id=user.id, name=user.name, role=user.role, org_id=user.org_id),
    )


from ..models import AppSetting
from ..schemas import LoginAdminIn

@router.post("/login-admin", response_model=TokenOut)
def login_admin(body: LoginAdminIn, session: Session = Depends(get_session)):
    # Get password from app_setting
    setting = session.get(AppSetting, "admin_password")
    pwd = setting.value if setting else "password123"
    
    if body.password != pwd:
        raise HTTPException(status_code=401, detail="Password salah")
        
    admin_user = session.exec(select(AppUser).where(AppUser.role == "admin", AppUser.is_active == True)).first()
    if not admin_user:
        raise HTTPException(status_code=404, detail="Akun admin tidak ditemukan di database")
        
    token = create_access_token(str(admin_user.id), admin_user.role, str(admin_user.org_id))
    return TokenOut(
        access_token=token,
        user=UserOut(
            id=admin_user.id, 
            name=admin_user.name, 
            role=admin_user.role, 
            org_id=admin_user.org_id
        ),
    )
