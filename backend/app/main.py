from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .routers import auth, dashboard, report, issue, site, users, admin, spy

app = FastAPI(title="MandorHub API", version="0.1.0")

_origins = ["*"] if settings.cors_origins == "*" else [
    o.strip() for o in settings.cors_origins.split(",")
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "traceback": traceback.format_exc()}
    )

@app.get("/api/health", tags=["meta"])
def health():
    return {"ok": True, "service": "mandorhub-api", "version": "0.1.0"}

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(report.router)
app.include_router(issue.router)
app.include_router(site.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(spy.router)
