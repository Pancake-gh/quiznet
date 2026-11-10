from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base

class User(Base):
  __tablename__ = "users"
  id = Column(Integer, primary_key=True, index=True)
  username = Column(String(20), index=True, nullable=False)
  hashed_password = Column(String, nullable=False)
  quiz = relationship('Quiz', back_populates='user', cascade='all, delete-orphan')

class Quiz(Base):
  __tablename__ = "quizzes"
  id = Column(Integer, primary_key=True, index=True)
  quiz_name = Column(String(50), nullable=False)
  description = Column(String(500), nullable=True)
  quiz_author = Column(Integer, ForeignKey('users.id'))
  quiz_creation_date = Column(DateTime)
  user = relationship('User', back_populates='quiz')
  question = relationship('Question', back_populates='quiz', cascade='all, delete-orphan')

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