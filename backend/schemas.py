from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

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
  answer_content: str = Field(min_length=1, max_length=120)
  is_correct : bool

class AnswerCreate(AnswerBase):
  answer_question: int

class AnswerUpdate(BaseModel):
  answer_content: str | None = Field(default=None, min_length=1, max_length=120)
  is_correct: bool

class AnswerResponse(AnswerBase):
  model_config = ConfigDict(from_attributes=True)

  id : int
  answer_question : int

class AnswerOptionResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  answer_question: int
  answer_content: str

class QuizPlayAnswerResponse(BaseModel):
  id: int
  answer_content: str

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
  player_name: str
  attempt_token: str

class QuizAttemptCreate(BaseModel):
  player_name: str = Field(min_length=2, max_length=30)

  @field_validator("player_name")
  @classmethod
  def normalize_player_name(cls, value: str) -> str:
    value = value.strip()
    if len(value) < 2:
      raise ValueError("Player name must contain at least two non-space characters.")
    return value

class QuizAnswerSubmission(BaseModel):
  question_id: int = Field(gt=0)
  answer_id: int = Field(gt=0)
  attempt_token: str = Field(min_length=32, max_length=128)

class ResultResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  user_id: int | None
  player_name: str
  quiz_id: int
  score: int
  total_questions: int
  completed_at: datetime

class LeaderboardEntryResponse(BaseModel):
  id: int
  player_name: str
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