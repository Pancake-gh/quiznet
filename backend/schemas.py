from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

class UserBase(BaseModel):
  username : str = Field(min_length=3, max_length=20)

class UserCreate(UserBase):
  password : str = Field(min_length=8)

class UserResponse(UserBase):
  model_config = ConfigDict(from_attributes=True)

  id: int

class QuizBase(BaseModel):
  quiz_name : str = Field(min_length=3, max_length=50)
  description: str | None = Field(default=None, max_length=500)

class QuizCreate(QuizBase):
  pass

class QuizUpdate(BaseModel):
  quiz_name : str = Field(min_length=3, max_length=50)
  description: str | None = Field(default=None, max_length=500)

class QuizResponse(QuizBase):
  model_config = ConfigDict(from_attributes=True)

  id : int
  quiz_creation_date : datetime
  quiz_author : int

class QuestionBase(BaseModel):
  question_number : int
  question_content : str = Field(min_length=3, max_length=100)
  question_quiz : int

class QuestionUpdate(BaseModel):
  question_number : int
  question_content : str = Field(min_length=3, max_length=100)
  question_quiz : int

class QuestionCreate(QuestionBase):
  pass

class QuestionResponse(QuestionBase):
  model_config = ConfigDict(from_attributes=True)

  id : int
  question_quiz : int

class AnswerBase(BaseModel):
  is_correct : bool

class AnswerCreate(AnswerBase):
  answer_question: int

class AnswerUpdate(BaseModel):
  is_correct: bool

class AnswerResponse(AnswerBase):
  model_config = ConfigDict(from_attributes=True)

  id : int
  answer_question : int

class Token(BaseModel):
  access_token: str
  token_type: str

class TokenData(BaseModel):
    username: str | None = None

class LoginRequest(BaseModel):
    username: str
    password: str