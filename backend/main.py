from fastapi import FastAPI, status
from database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

#app.include_router()

@app.get("/", status_code=status.HTTP_200_OK)
def status():
  return {"message": "API is running."}