from sqlmodel import Session, create_engine

from .config import settings

db_url = settings.database_url
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(db_url, pool_pre_ping=True)

def get_session():
    with Session(engine) as session:
        yield session
