from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from models import Question, Quiz, User
from schemas import QuestionResponse, QuizCreate, QuizResponse, QuizUpdate

router = APIRouter(prefix="/quiz", tags=["quizzes"])


@router.post("/create", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
def create_quiz(
    quiz: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        db_quiz = Quiz(
            quiz_name=quiz.quiz_name,
            description=quiz.description,
            quiz_author=current_user.id,
            quiz_creation_date=datetime.utcnow(),
        )
        db.add(db_quiz)
        db.commit()
        db.refresh(db_quiz)
        return db_quiz
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database error: Could not create quiz due to data or constraint violation.",
        )


@router.put("/{quiz_id}", response_model=QuizResponse, status_code=status.HTTP_200_OK)
def update_quiz(
    quiz_id: int,
    quiz_data: QuizUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if db_quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Quiz with ID {quiz_id} not found.")
    if current_user.id != db_quiz.quiz_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own quizzes.")

    try:
        update_data = quiz_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_quiz, key, value)
        db.commit()
        db.refresh(db_quiz)
        return db_quiz
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database error: Could not update quiz due to data or constraint violation.",
        )


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if db_quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Quiz with ID {quiz_id} not found.")
    if current_user.id != db_quiz.quiz_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own quizzes.")

    try:
        db.delete(db_quiz)
        db.commit()
        return
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error: Could not delete quiz.",
        )


@router.get("/", response_model=list[QuizResponse], status_code=status.HTTP_200_OK)
def get_all_quizzes(db: Session = Depends(get_db)):
    return db.query(Quiz).all()

def get_quiz_questions(quiz_id: int, db: Session = Depends(get_db)):
    db_quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if db_quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return (
        db.query(Question)
        .filter(Question.question_quiz == quiz_id)
        .order_by(Question.question_number, Question.id)
        .all()
    )

@router.get("/{quiz_id}", response_model=QuizResponse, status_code=status.HTTP_200_OK)
def get_quiz_by_id(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz