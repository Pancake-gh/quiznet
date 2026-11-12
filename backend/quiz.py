from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from models import Answer, Question, Quiz, QuizAttempt, QuizAttemptAnswer, Result, User
from schemas import (
    QuizCreate,
    QuizAnswerProgressResponse,
    QuizAnswerSubmission,
    QuizAttemptResponse,
    QuizPlayAnswerResponse,
    QuizPlayQuestionResponse,
    QuizPlayResponse,
    QuizResponse,
    QuizUpdate,
    ResultResponse,
)

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


@router.get("/{quiz_id}", response_model=QuizResponse, status_code=status.HTTP_200_OK)
def get_quiz_by_id(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.get("/{quiz_id}/play", response_model=QuizPlayResponse, status_code=status.HTTP_200_OK)
def get_quiz_for_play(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    questions = (
        db.query(Question)
        .filter(Question.question_quiz == quiz_id)
        .order_by(Question.question_number, Question.id)
        .all()
    )
    question_ids = [question.id for question in questions]
    answers_by_question: dict[int, list[QuizPlayAnswerResponse]] = {
        question_id: [] for question_id in question_ids
    }
    if question_ids:
        answers = db.query(Answer).filter(Answer.answer_question.in_(question_ids)).all()
        for answer in answers:
            answers_by_question[answer.answer_question].append(
                QuizPlayAnswerResponse(id=answer.id)
            )

    return QuizPlayResponse(
        id=quiz.id,
        quiz_name=quiz.quiz_name,
        description=quiz.description,
        questions=[
            QuizPlayQuestionResponse(
                id=question.id,
                question_number=question.question_number,
                question_content=question.question_content,
                answers=answers_by_question[question.id],
            )
            for question in questions
        ],
    )


@router.post(
    "/{quiz_id}/attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_quiz_attempt(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    total_questions = db.query(Question).filter(Question.question_quiz == quiz_id).count()
    if total_questions == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quiz has no questions to solve.",
        )
    question_without_answers = (
        db.query(Question.id)
        .outerjoin(Answer, Answer.answer_question == Question.id)
        .filter(
            Question.question_quiz == quiz_id,
            Answer.id.is_(None),
        )
        .first()
    )
    if question_without_answers is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Every question in this quiz must have at least one answer.",
        )

    attempt = QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz_id,
        started_at=datetime.utcnow(),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return QuizAttemptResponse(
        id=attempt.id,
        quiz_id=quiz_id,
        total_questions=total_questions,
    )


@router.post(
    "/{quiz_id}/attempts/{attempt_id}/answers",
    response_model=QuizAnswerProgressResponse,
    status_code=status.HTTP_200_OK,
)
def submit_quiz_answer(
    quiz_id: int,
    attempt_id: int,
    submission: QuizAnswerSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    attempt = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.id == attempt_id,
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.user_id == current_user.id,
        )
        .first()
    )
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz attempt not found")
    if attempt.completed_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Quiz attempt is already complete")

    question = (
        db.query(Question)
        .filter(
            Question.id == submission.question_id,
            Question.question_quiz == quiz_id,
        )
        .first()
    )
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question does not belong to this quiz.",
        )

    answer = (
        db.query(Answer)
        .filter(
            Answer.id == submission.answer_id,
            Answer.answer_question == question.id,
        )
        .first()
    )
    if answer is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer does not belong to this question.",
        )

    existing_answer = (
        db.query(QuizAttemptAnswer)
        .filter(
            QuizAttemptAnswer.attempt_id == attempt.id,
            QuizAttemptAnswer.question_id == question.id,
        )
        .first()
    )
    if existing_answer is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An answer has already been submitted for this question.",
        )

    db.add(
        QuizAttemptAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_id=answer.id,
            is_correct=answer.is_correct,
        )
    )
    db.flush()

    total_questions = db.query(Question).filter(Question.question_quiz == quiz_id).count()
    answered_questions = (
        db.query(QuizAttemptAnswer)
        .filter(QuizAttemptAnswer.attempt_id == attempt.id)
        .count()
    )
    result = None
    if answered_questions == total_questions:
        score = (
            db.query(QuizAttemptAnswer)
            .filter(
                QuizAttemptAnswer.attempt_id == attempt.id,
                QuizAttemptAnswer.is_correct.is_(True),
            )
            .count()
        )
        result = Result(
            user_id=current_user.id,
            quiz_id=quiz_id,
            score=score,
            total_questions=total_questions,
            completed_at=datetime.utcnow(),
        )
        attempt.completed_at = result.completed_at
        db.add(result)

    db.commit()
    if result is not None:
        db.refresh(result)
    return QuizAnswerProgressResponse(
        answered_questions=answered_questions,
        total_questions=total_questions,
        completed=result is not None,
        result=result,
    )