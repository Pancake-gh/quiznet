from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from database import Base

class User(Base):
  __tablename__ = "users"
  id = Column(Integer, primary_key=True, index=True)
  username = Column(String(20), index=True, nullable=False)
  hashed_password = Column(String, nullable=False)
  quiz = relationship('Quiz', back_populates='user', cascade='all, delete-orphan')
  results = relationship('Result', back_populates='user', cascade='all, delete-orphan')
  quiz_attempts = relationship('QuizAttempt', back_populates='user', cascade='all, delete-orphan')

class Quiz(Base):
  __tablename__ = "quizzes"
  id = Column(Integer, primary_key=True, index=True)
  quiz_name = Column(String(50), nullable=False)
  description = Column(String(500), nullable=True)
  quiz_author = Column(Integer, ForeignKey('users.id'))
  quiz_creation_date = Column(DateTime)
  user = relationship('User', back_populates='quiz')
  question = relationship('Question', back_populates='quiz', cascade='all, delete-orphan')
  results = relationship('Result', back_populates='quiz', cascade='all, delete-orphan')
  attempts = relationship('QuizAttempt', back_populates='quiz', cascade='all, delete-orphan')

class Question(Base):
  __tablename__ = "questions"
  id = Column(Integer, primary_key=True, index=True)
  question_number = Column(Integer)
  question_content = Column(String, nullable=False)
  question_quiz = Column(Integer, ForeignKey('quizzes.id'))
  quiz = relationship('Quiz', back_populates='question' )
  answer = relationship('Answer', back_populates='question', cascade='all, delete-orphan')

class Answer(Base):
  __tablename__ = "answers"
  id = Column(Integer, primary_key=True, index=True)
  is_correct = Column(Boolean, nullable=False)
  answer_question = Column(Integer, ForeignKey('questions.id'))
  question = relationship('Question', back_populates='answer')

class Result(Base):
  __tablename__ = "results"
  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
  quiz_id = Column(Integer, ForeignKey('quizzes.id'), nullable=False)
  score = Column(Integer, nullable=False)
  total_questions = Column(Integer, nullable=False)
  completed_at = Column(DateTime, nullable=False)
  user = relationship('User', back_populates='results')
  quiz = relationship('Quiz', back_populates='results')

class QuizAttempt(Base):
  __tablename__ = "quiz_attempts"
  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
  quiz_id = Column(Integer, ForeignKey('quizzes.id'), nullable=False)
  started_at = Column(DateTime, nullable=False)
  completed_at = Column(DateTime, nullable=True)
  user = relationship('User', back_populates='quiz_attempts')
  quiz = relationship('Quiz', back_populates='attempts')
  answers = relationship('QuizAttemptAnswer', back_populates='attempt', cascade='all, delete-orphan')

class QuizAttemptAnswer(Base):
  __tablename__ = "quiz_attempt_answers"
  __table_args__ = (UniqueConstraint('attempt_id', 'question_id'),)
  id = Column(Integer, primary_key=True, index=True)
  attempt_id = Column(Integer, ForeignKey('quiz_attempts.id'), nullable=False)
  question_id = Column(Integer, ForeignKey('questions.id'), nullable=False)
  answer_id = Column(Integer, ForeignKey('answers.id'), nullable=False)
  is_correct = Column(Boolean, nullable=False)
  attempt = relationship('QuizAttempt', back_populates='answers')