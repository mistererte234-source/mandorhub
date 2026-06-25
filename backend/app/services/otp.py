"""OTP store sederhana untuk DEV.

PRODUKSI: ganti dengan Redis (TTL) + pengiriman via WhatsApp Business API
(Fonnte/Wablas) atau SMS. Interface-nya sengaja dibuat kecil agar mudah ditukar.
"""

import random
import time

_TTL_SECONDS = 300  # 5 menit
_store: dict[str, tuple[str, float]] = {}


def generate(phone: str) -> str:
    code = f"{random.randint(0, 999999):06d}"
    _store[phone] = (code, time.time() + _TTL_SECONDS)
    return code


def verify(phone: str, code: str) -> bool:
    rec = _store.get(phone)
    if not rec:
        return False
    saved, expires_at = rec
    if time.time() > expires_at:
        _store.pop(phone, None)
        return False
    if saved == code:
        _store.pop(phone, None)  # one-time use
        return True
    return False
