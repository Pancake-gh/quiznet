from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, relationship, DeclarativeBase
from sqlalchemy.exc import IntegrityError

engine = create_engine("sqlite:///./database.db", connect_args={"check_same_thread": False} , echo=False )
Session = sessionmaker(bind=engine)

class Base(DeclarativeBase):
  pass

def get_db():
  with Session() as db:
    yield db