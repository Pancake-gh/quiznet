from fastapi import FastAPI, status

import answer
import auth
import question
import quiz
from database import Base, engine, migrate_legacy_database

migrate_legacy_database(engine)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="QuizNet API")

app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(question.router)
app.include_router(answer.router)


@app.get("/", status_code=status.HTTP_200_OK)
def status():
    return {"message": "API is running."}