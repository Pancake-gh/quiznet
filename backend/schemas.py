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

class AnswerOptionResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  answer_question: int

class QuizPlayAnswerResponse(BaseModel):
  id: int

class QuizPlayQuestionResponse(BaseModel):
  id: int
  question_number: int
  question_content: str
  answers: list[QuizPlayAnswerResponse]

class QuizPlayResponse(BaseModel):
  id: int
  quiz_name: str
  description: str | None
  questions: list[QuizPlayQuestionResponse]

class QuizAttemptResponse(BaseModel):
  id: int
  quiz_id: int
  total_questions: int

class QuizAnswerSubmission(BaseModel):
  question_id: int = Field(gt=0)
  answer_id: int = Field(gt=0)

class ResultResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  user_id: int
  quiz_id: int
  score: int
  total_questions: int
  completed_at: datetime

class QuizAnswerProgressResponse(BaseModel):
  answered_questions: int
  total_questions: int
  completed: bool
  result: ResultResponse | None = None

class Token(BaseModel):
  access_token: str
  token_type: str

class TokenData(BaseModel):
    username: str | None = None

class LoginRequest(BaseModel):
    username: str
    password: str