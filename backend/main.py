from fastapi import FastAPI, status
from database import Base, engine

import auth

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth.router)

@app.get("/", status_code=status.HTTP_200_OK)
def status():
  return {"message": "API is running."}