from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql://localhost/blog_db"

engine = create_engine(DATABASE_URL)
Base = declarative_base()

def get_session():
    Session = sessionmaker(bind=engine)
    return Session()

db_session = get_session()

def init_db():
    Base.metadata.create_all(bind=engine)
