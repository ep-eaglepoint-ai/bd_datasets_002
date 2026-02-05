import os
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker, declarative_base


def _create_engine(database_url: str):
    if database_url.startswith("sqlite"):
        return create_engine(
            database_url,
            connect_args={"check_same_thread": False},
            future=True,
        )
    return create_engine(database_url, pool_pre_ping=True, future=True)


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/blog_db")
engine = _create_engine(DATABASE_URL)

SessionFactory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Session = scoped_session(SessionFactory)

Base = declarative_base()


def get_session():
    return Session()


@contextmanager
def session_scope():
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        Session.remove()


def init_db():
    Base.metadata.create_all(bind=engine)


def remove_session(exception=None):
    Session.remove()


def configure_engine(database_url: str):
    global engine, SessionFactory, Session
    engine = _create_engine(database_url)
    SessionFactory = sessionmaker(
        bind=engine, autoflush=False, expire_on_commit=False
    )
    Session = scoped_session(SessionFactory)