from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from models import Question, Quiz, User
from schemas import QuestionCreate, QuestionResponse, QuestionUpdate

router = APIRouter(prefix="/question", tags=["questions"])


@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    question: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_quiz = db.query(Quiz).filter(Quiz.id == question.question_quiz).first()
    if db_quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    if current_user.id != db_quiz.quiz_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only add questions to your own quizzes.")

    try:
        db_question = Question(**question.model_dump())
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        return db_question
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database error: Could not create question due to data or constraint violation.",
        )


@router.put("/{question_id}", response_model=QuestionResponse, status_code=status.HTTP_200_OK)
def update_question(
    question_id: int,
    question_data: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if db_question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question with ID {question_id} not found.")
    if db_question.quiz is None or current_user.id != db_question.quiz.quiz_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update questions in your own quizzes.")

    try:
        update_data = question_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_question, key, value)
        db.commit()
        db.refresh(db_question)
        return db_question
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database error: Could not update question due to data or constraint violation.",
        )


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if db_question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question with ID {question_id} not found.")
    if db_question.quiz is None or current_user.id != db_question.quiz.quiz_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete questions in your own quizzes.")

    try:
        db.delete(db_question)
        db.commit()
        return
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error: Could not delete question.",
        )


@router.get("/", response_model=list[QuestionResponse], status_code=status.HTTP_200_OK)
def get_all_questions(db: Session = Depends(get_db)):
    return db.query(Question).all()


@router.get("/{question_id}", response_model=QuestionResponse, status_code=status.HTTP_200_OK)
def get_question_by_id(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question