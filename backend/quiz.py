from datetime import datetime
import hashlib
import hmac
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from auth import get_current_active_user, get_optional_current_user
from database import get_db
from models import Answer, Question, Quiz, QuizAttempt, QuizAttemptAnswer, Result, User
from schemas import (
    QuizCreate,
    QuizListResponse,
    QuizAnswerProgressResponse,
    QuizAnswerSubmission,
    QuizAttemptCreate,
    QuizAttemptResponse,
    LeaderboardEntryResponse,
    QuizPlayAnswerResponse,
    QuizPlayQuestionResponse,
    QuizPlayResponse,
    QuizAttemptResultResponse,
    QuizResponse,
    QuizUpdate,
)

router = APIRouter(prefix="/quiz", tags=["quizzes"])


@router.post("/create", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
def create_quiz(
    quiz: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_quiz = Quiz(
        quiz_name=quiz.quiz_name,
        description=quiz.description,
        time_limit_seconds=quiz.time_limit_seconds,
        quiz_author=current_user.id,
        quiz_creation_date=datetime.utcnow(),
    )
    try:
        db.add(db_quiz)
        db.flush()
        for question_number, question_data in enumerate(quiz.questions, start=1):
            db_question = Question(
                question_number=question_number,
                question_content=question_data.question_content,
                question_quiz=db_quiz.id,
            )
            db.add(db_question)
            db.flush()
            db.add_all(
                Answer(
                    answer_content=answer_data.answer_content,
                    is_correct=answer_data.is_correct,
                    answer_question=db_question.id,
                )
                for answer_data in question_data.answers
            )
        db.commit()
        db.refresh(db_quiz)
        return db_quiz
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not save quiz and questions.",
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


@router.get("/", response_model=list[QuizListResponse], status_code=status.HTTP_200_OK)
@router.get("", response_model=list[QuizListResponse], status_code=status.HTTP_200_OK, include_in_schema=False)
def get_all_quizzes(db: Session = Depends(get_db)):
    rows = (
        db.query(Quiz, func.count(Question.id).label("question_count"))
        .outerjoin(Question, Question.question_quiz == Quiz.id)
        .group_by(Quiz.id)
        .order_by(Quiz.quiz_creation_date.desc(), Quiz.id.desc())
        .all()
    )
    return [
        {
            "id": quiz.id,
            "quiz_name": quiz.quiz_name,
            "description": quiz.description,
            "quiz_creation_date": quiz.quiz_creation_date,
            "quiz_author": quiz.quiz_author,
            "question_count": question_count,
        }
        for quiz, question_count in rows
    ]


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
        answers = (
            db.query(Answer)
            .filter(Answer.answer_question.in_(question_ids))
            .order_by(Answer.id)
            .all()
        )
        for answer in answers:
            answers_by_question[answer.answer_question].append(
                QuizPlayAnswerResponse(
                    id=answer.id,
                    answer_content=answer.answer_content,
                )
            )

    return QuizPlayResponse(
        id=quiz.id,
        quiz_name=quiz.quiz_name,
        description=quiz.description,
        time_limit_seconds=quiz.time_limit_seconds,
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
    attempt_data: QuizAttemptCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
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
    question_ids = [
        question_id
        for (question_id,) in db.query(Question.id)
        .filter(Question.question_quiz == quiz_id)
        .all()
    ]
    answer_rows = (
        db.query(Answer.answer_question, Answer.is_correct)
        .filter(Answer.answer_question.in_(question_ids))
        .all()
    )
    answer_counts: dict[int, tuple[int, int]] = {}
    for question_id, is_correct in answer_rows:
        answer_count, correct_count = answer_counts.get(question_id, (0, 0))
        answer_counts[question_id] = (
            answer_count + 1,
            correct_count + int(is_correct),
        )
    if any(answer_counts.get(question_id, (0, 0)) != (4, 1) for question_id in question_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Every question must have exactly four answers and exactly one correct answer.",
        )

    attempt_token = secrets.token_urlsafe(32)
    attempt_started_at = datetime.utcnow()
    attempt = QuizAttempt(
        user_id=current_user.id if current_user else None,
        player_name=current_user.username if current_user else attempt_data.player_name,
        attempt_token_hash=hashlib.sha256(attempt_token.encode()).hexdigest(),
        quiz_id=quiz_id,
        started_at=attempt_started_at,
        question_started_at=attempt_started_at,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return QuizAttemptResponse(
        id=attempt.id,
        quiz_id=quiz_id,
        total_questions=total_questions,
        player_name=attempt.player_name,
        attempt_token=attempt_token,
        requires_auth=current_user is not None,
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
    current_user: User | None = Depends(get_optional_current_user),
):
    attempt = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.id == attempt_id,
            QuizAttempt.quiz_id == quiz_id,
        )
        .first()
    )
    submitted_token_hash = hashlib.sha256(submission.attempt_token.encode()).hexdigest()
    if attempt is None or not hmac.compare_digest(attempt.attempt_token_hash, submitted_token_hash):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz attempt not found")
    if attempt.user_id is not None and (
        current_user is None or attempt.user_id != current_user.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz attempt not found")
    if attempt.completed_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Quiz attempt is already complete")

    total_questions = db.query(Question).filter(Question.question_quiz == quiz_id).count()
    answered_questions_before_submission = (
        db.query(QuizAttemptAnswer)
        .filter(QuizAttemptAnswer.attempt_id == attempt.id)
        .count()
    )
    expected_question = (
        db.query(Question)
        .filter(Question.question_quiz == quiz_id)
        .order_by(Question.question_number, Question.id)
        .offset(answered_questions_before_submission)
        .first()
    )
    if expected_question is None or expected_question.id != submission.question_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Answer questions in order.",
        )

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

    current_time = datetime.utcnow()
    time_limit_seconds = attempt.quiz.time_limit_seconds
    question_started_at = attempt.question_started_at or attempt.started_at
    timed_out = submission.timed_out or (
        time_limit_seconds is not None
        and (current_time - question_started_at).total_seconds() >= time_limit_seconds
    )

    if timed_out:
        answer = (
            db.query(Answer)
            .filter(
                Answer.answer_question == question.id,
                Answer.is_correct.is_(False),
            )
            .order_by(Answer.id)
            .first()
        )
        if answer is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Timed-out questions must have an incorrect answer option.",
            )
        is_correct = False
    else:
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
        is_correct = answer.is_correct

    db.add(
        QuizAttemptAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_id=answer.id,
            is_correct=is_correct,
        )
    )
    db.flush()

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
        completed_at = datetime.utcnow()
        attempt.completed_at = completed_at
        is_saved = attempt.user_id is not None
        if is_saved:
            db.add(
                Result(
                    user_id=attempt.user_id,
                    player_name=attempt.player_name,
                    quiz_id=quiz_id,
                    score=score,
                    total_questions=total_questions,
                    completed_at=completed_at,
                )
            )
        result = QuizAttemptResultResponse(
            player_name=attempt.player_name,
            score=score,
            total_questions=total_questions,
            saved=is_saved,
        )
    else:
        attempt.question_started_at = current_time

    db.commit()
    return QuizAnswerProgressResponse(
        answered_questions=answered_questions,
        total_questions=total_questions,
        completed=result is not None,
        result=result,
    )


@router.get(
    "/{quiz_id}/leaderboard",
    response_model=list[LeaderboardEntryResponse],
    status_code=status.HTTP_200_OK,
)
def get_quiz_leaderboard(
    quiz_id: int,
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    if db.query(Quiz.id).filter(Quiz.id == quiz_id).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    results = (
        db.query(Result)
        .filter(Result.quiz_id == quiz_id, Result.user_id.is_not(None))
        .order_by(Result.score.desc(), Result.completed_at.asc(), Result.id.asc())
        .limit(limit)
        .all()
    )
    return results