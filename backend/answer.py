from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from models import Answer, Question, User
from schemas import AnswerCreate, AnswerOptionResponse, AnswerResponse, AnswerUpdate

router = APIRouter(prefix="/answer", tags=["answers"])


@router.post("/", response_model=AnswerResponse, status_code=status.HTTP_201_CREATED)
def create_answer(
    answer: AnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    question = db.query(Question).filter(Question.id == answer.answer_question).first()
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    if question.quiz is None or current_user.id != question.quiz.quiz_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only add answers to questions in your own quizzes.")

    try:
        db_answer = Answer(**answer.model_dump())
        db.add(db_answer)
        db.commit()
        db.refresh(db_answer)
        return db_answer
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database error: Could not create answer due to data or constraint violation.",
        )


@router.put("/{answer_id}", response_model=AnswerResponse, status_code=status.HTTP_200_OK)
def update_answer(
    answer_id: int,
    answer_data: AnswerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_answer = db.query(Answer).filter(Answer.id == answer_id).first()
    if db_answer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Answer with ID {answer_id} not found.")
    if db_answer.question is None or db_answer.question.quiz is None or current_user.id != db_answer.question.quiz.quiz_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update answers in your own quizzes.")

    try:
        db_answer.is_correct = answer_data.is_correct
        db.commit()
        db.refresh(db_answer)
        return db_answer
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database error: Could not update answer due to data or constraint violation.",
        )


@router.delete("/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_answer(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_answer = db.query(Answer).filter(Answer.id == answer_id).first()
    if db_answer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Answer with ID {answer_id} not found.")
    if db_answer.question is None or db_answer.question.quiz is None or current_user.id != db_answer.question.quiz.quiz_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete answers in your own quizzes.")

    try:
        db.delete(db_answer)
        db.commit()
        return
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error: Could not delete answer.",
        )


@router.get("/", response_model=list[AnswerOptionResponse], status_code=status.HTTP_200_OK)
def get_all_answers(db: Session = Depends(get_db)):
    return db.query(Answer).all()


@router.get("/{answer_id}", response_model=AnswerOptionResponse, status_code=status.HTTP_200_OK)
def get_answer_by_id(answer_id: int, db: Session = Depends(get_db)):
    answer = db.query(Answer).filter(Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    return answer


@router.get("/question/{question_id}", response_model=list[AnswerOptionResponse], status_code=status.HTTP_200_OK)
def get_answers_for_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return db.query(Answer).filter(Answer.answer_question == question_id).all()
