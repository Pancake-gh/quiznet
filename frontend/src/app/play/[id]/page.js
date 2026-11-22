"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { apiRequest } from "../../../lib/api";
import {
  getAccessToken,
  getSessionUsername,
  subscribeToSessionChanges,
} from "../../../lib/auth-session";

function shuffle(items) {
  const shuffledItems = [...items];
  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[swapIndex]] = [
      shuffledItems[swapIndex],
      shuffledItems[index],
    ];
  }
  return shuffledItems;
}

function PlayQuizContent() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerQuestionIndex, setTimerQuestionIndex] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState("");
  const [reportingQuestionId, setReportingQuestionId] = useState(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportedQuestionIds, setReportedQuestionIds] = useState([]);
  const submissionInProgress = useRef(false);
  const submitAnswerRef = useRef(null);

  useEffect(() => {
    let active = true;
    function syncSession() {
      setIsAuthenticated(Boolean(getAccessToken()));
      setPlayerName(getSessionUsername() || "");
      setAuthChecked(true);
    }

    syncSession();
    const unsubscribe = subscribeToSessionChanges(syncSession);
    apiRequest(`/quiz/${id}/play`)
      .then((savedQuiz) => {
        if (active) {
          setQuiz(savedQuiz);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [id]);

  async function startQuiz(event) {
    event.preventDefault();
    if (!isAuthenticated && playerName.trim().length < 2) {
      setError("Wpisz nazwę gracza (co najmniej 2 znaki).");
      return;
    }
    try {
      const newAttempt = await apiRequest(`/quiz/${id}/attempts`, {
        method: "POST",
        body: { player_name: playerName.trim() },
      });
      if (quiz.randomize_questions) {
        setQuiz({
          ...quiz,
          questions: shuffle(quiz.questions).map((question) => ({
            ...question,
            answers: shuffle(question.answers),
          })),
        });
      }
      setAttempt(newAttempt);
      setError("");
      setQuestionIndex(0);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    const timeLimit = quiz?.time_limit_seconds;
    if (!timeLimit || questionIndex < 0 || result) {
      setTimerQuestionIndex(questionIndex);
      setTimeRemaining(null);
      return;
    }

    const deadline = Date.now() + timeLimit * 1000;
    setTimerQuestionIndex(questionIndex);
    setTimeRemaining(timeLimit);
    const intervalId = window.setInterval(() => {
      setTimeRemaining(
        Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
      );
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [quiz?.time_limit_seconds, questionIndex, result]);

  async function submitSelectedAnswer(timedOut = false) {
    if (submissionInProgress.current) {
      return;
    }
    if (!timedOut && selectedAnswer === "") {
      setError("Wybierz jedną odpowiedź.");
      return;
    }

    const currentQuestion = quiz.questions[questionIndex];
    submissionInProgress.current = true;
    setIsSubmitting(true);
    try {
      const progress = await apiRequest(`/quiz/${id}/attempts/${attempt.id}/answers`, {
        method: "POST",
        body: {
          question_id: currentQuestion.id,
          answer_id: timedOut ? null : Number(selectedAnswer),
          attempt_token: attempt.attempt_token,
          timed_out: timedOut,
        },
      });
      setError("");
      setSelectedAnswer("");
      if (progress.completed) {
        setResult(progress.result);
        return;
      }
      setQuestionIndex((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  submitAnswerRef.current = submitSelectedAnswer;

  useEffect(() => {
    if (
      timerQuestionIndex === questionIndex &&
      timeRemaining === 0 &&
      questionIndex >= 0 &&
      !result
    ) {
      void submitAnswerRef.current?.(true);
    }
  }, [timeRemaining, timerQuestionIndex, questionIndex, result]);

  function submitAnswer(event) {
    event.preventDefault();
    void submitSelectedAnswer(questionTimeRemaining === 0);
  }

  async function submitQuestionReport(event, review) {
    event.preventDefault();
    const details = reportDetails.trim();
    if (details.length < 5) {
      setReportError("Opisz problem (co najmniej 5 znaków).");
      return;
    }

    setReportSubmitting(true);
    setReportError("");
    try {
      await apiRequest(`/quiz/${id}/reports`, {
        method: "POST",
        body: {
          question_id: review.question_id,
          attempt_id: attempt.id,
          attempt_token: attempt.attempt_token,
          details,
        },
      });
      setReportedQuestionIds((current) => [...current, review.question_id]);
      setReportingQuestionId(null);
      setReportDetails("");
    } catch (requestError) {
      setReportError(requestError.message);
    } finally {
      setReportSubmitting(false);
    }
  }

  const questionTimeRemaining =
    timerQuestionIndex === questionIndex ? timeRemaining : null;
  const timerIsStarting =
    quiz?.time_limit_seconds && timerQuestionIndex !== questionIndex;
  const question = quiz?.questions[questionIndex];

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900 sm:px-8">
      <section className="mx-auto max-w-3xl">
        {error && (
          <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="rounded-3xl border border-green-100 bg-white p-6 text-center shadow-sm sm:p-10">
            <p className="text-sm font-semibold text-green-700">Quiz ukończony</p>
            <h1 className="mt-2 text-3xl font-bold">{quiz.quiz_name}</h1>
            <p className="mt-6 text-5xl font-extrabold text-green-800">
              {result.score}
              <span className="text-2xl text-stone-500">/{result.total_questions}</span>
            </p>
            <p className="mt-3 text-stone-600">Gracz: {result.player_name}</p>
            <p className="mt-1 text-sm text-stone-500">
              {result.saved
                ? "Zapisano wynik w tabeli."
                : "Rozwiązałeś quiz jako gość. Wynik nie został zapisany."}
            </p>
            <section className="mt-8 text-left" aria-labelledby="review-heading">
              <h2 className="text-xl font-bold" id="review-heading">
                Przegląd odpowiedzi
              </h2>
              <ol className="mt-4 space-y-4">
                {result.question_reviews.map((review) => (
                  <li
                    className={`relative rounded-2xl border p-4 ${
                      review.is_correct
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                    key={review.question_number}
                  >
                    {reportedQuestionIds.includes(review.question_id) ? (
                      <span
                        aria-label="Zgłoszenie wysłane"
                        className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center text-green-700"
                        role="status"
                        title="Zgłoszenie wysłane"
                      >
                        <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path
                            d="M5 21V5m0 0h13l-2 4 2 4H5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </span>
                    ) : (
                      <button
                        aria-expanded={reportingQuestionId === review.question_id}
                        aria-label="Zgłoś pytanie autorowi"
                        className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 transition hover:bg-white hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:cursor-wait disabled:opacity-60"
                        disabled={reportSubmitting}
                        onClick={() => {
                          setReportingQuestionId((current) =>
                            current === review.question_id ? null : review.question_id,
                          );
                          setReportDetails("");
                          setReportError("");
                        }}
                        title="Zgłoś pytanie autorowi"
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path
                            d="M5 21V5m0 0h13l-2 4 2 4H5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                    )}
                    <p className="pr-10 font-semibold text-stone-900">
                      {review.question_number}. {review.question_content}
                    </p>
                    <p className={`mt-2 text-sm font-semibold ${
                      review.is_correct ? "text-green-800" : "text-red-800"
                    }`}>
                      {review.is_correct ? "Poprawna odpowiedź" : "Niepoprawna odpowiedź"}
                    </p>
                    <p className="mt-1 text-sm text-stone-700">
                      Twoja odpowiedź:{" "}
                      {review.timed_out
                        ? "Brak odpowiedzi — upłynął czas."
                        : review.selected_answer}
                    </p>
                    {!review.is_correct && (
                      <p className="mt-1 text-sm text-stone-700">
                        Poprawna odpowiedź: {review.correct_answer}
                      </p>
                    )}
                    {reportingQuestionId === review.question_id &&
                      !reportedQuestionIds.includes(review.question_id) && (
                      <form
                        className="mt-4"
                        onSubmit={(event) => submitQuestionReport(event, review)}
                      >
                        <label className="block text-sm font-medium text-stone-700">
                          Co należy poprawić?
                          <textarea
                            autoFocus
                            className="mt-2 min-h-24 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                            maxLength={1000}
                            minLength={5}
                            onChange={(event) => setReportDetails(event.target.value)}
                            placeholder="Opisz błąd w odpowiedzi lub literówkę."
                            required
                            value={reportDetails}
                          />
                        </label>
                        {reportError && (
                          <p className="mt-2 text-sm text-red-700" role="alert">
                            Nie udało się wysłać zgłoszenia. {reportError}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-60"
                            disabled={reportSubmitting}
                            type="submit"
                          >
                            {reportSubmitting ? "Wysyłanie…" : "Wyślij zgłoszenie"}
                          </button>
                          <button
                            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-white"
                            disabled={reportSubmitting}
                            onClick={() => {
                              setReportingQuestionId(null);
                              setReportError("");
                            }}
                            type="button"
                          >
                            Anuluj
                          </button>
                        </div>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
            </section>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {result.saved ? (
                <Link
                  className="inline-flex rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                  href={`/results#quiz-${quiz.id}`}
                >
                  Zobacz tabelę wyników
                </Link>
              ) : (
                <Link
                  className="inline-flex rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                  href="/account"
                >
                  Zaloguj się na kolejne podejście
                </Link>
              )}
              <Link
                className="inline-flex rounded-xl border border-stone-300 px-5 py-3 font-semibold text-stone-700 hover:bg-stone-50"
                href="/"
              >
                Wróć do quizów
              </Link>
            </div>
          </div>
        )}
        {quiz && !authChecked && !result && (
          <p className="text-sm text-stone-600" role="status">
            Sprawdzanie sesji…
          </p>
        )}
        {quiz && authChecked && attempt?.requires_auth && !isAuthenticated && !result && (
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-green-700">Quiz</p>
            <h1 className="mt-2 text-3xl font-bold">{quiz.quiz_name}</h1>
            <p className="mt-4 leading-6 text-stone-600">
              Zaloguj się ponownie, aby kontynuować to podejście i zapisać wynik.
            </p>
            <Link
              className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
              href="/account"
            >
              Zaloguj się lub utwórz konto
            </Link>
          </div>
        )}
        {quiz && authChecked && !result && questionIndex < 0 && (
          <form
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
            onSubmit={startQuiz}
          >
            <p className="text-sm font-semibold text-green-700">Quiz</p>
            <h1 className="mt-2 text-3xl font-bold">{quiz.quiz_name}</h1>
            {quiz.description && <p className="mt-3 text-stone-600">{quiz.description}</p>}
            <p className="mt-5 text-sm text-stone-500">
              {quiz.questions.length} {quiz.questions.length === 1 ? "pytanie" : "pytań"}
            </p>
            {quiz.time_limit_seconds && (
              <p className="mt-2 text-sm text-stone-500">
                Limit czasu: {quiz.time_limit_seconds} s na każde pytanie
              </p>
            )}
            {isAuthenticated ? (
              <p className="mt-6 text-sm text-stone-600">
                Gracz: <span className="font-semibold text-stone-900">{playerName}</span>
              </p>
            ) : (
              <label className="mt-6 block text-sm font-semibold text-stone-700">
                Nazwa gracza
                <input
                  autoComplete="nickname"
                  className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  maxLength={30}
                  minLength={2}
                  onChange={(event) => setPlayerName(event.target.value)}
                  required
                  value={playerName}
                />
              </label>
            )}
            <button
              className="mt-6 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
              type="submit"
            >
              Rozpocznij quiz
            </button>
          </form>
        )}
        {!quiz && !error && (
          <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Nie znaleziono quizu</h1>
            <p className="mt-2 text-stone-600">
              Nie znaleziono quizu na serwerze.
            </p>
            <Link className="mt-5 inline-block font-semibold text-green-800 underline" href="/">
              Wróć do listy quizów
            </Link>
          </div>
        )}
        {question && (!attempt?.requires_auth || isAuthenticated) && !result && (
          <form
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
            onSubmit={submitAnswer}
          >
            <div className="flex items-center justify-between gap-3 text-sm text-stone-500">
              <span>{quiz.quiz_name}</span>
              <span>{questionIndex + 1} / {quiz.questions.length}</span>
            </div>
            {questionTimeRemaining !== null && (
              <p
                aria-live="polite"
                className={`mt-3 text-sm font-semibold ${
                  questionTimeRemaining <= 5 ? "text-red-700" : "text-stone-600"
                }`}
              >
                Pozostało {questionTimeRemaining} s
              </p>
            )}
            <h1 className="mt-5 text-2xl font-bold">{question.question_content}</h1>
            <fieldset className="mt-6 space-y-3">
              <legend className="sr-only">Wybierz odpowiedź</legend>
              {question.answers.map((answer, index) => (
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                    selectedAnswer === String(answer.id)
                      ? "border-green-500 bg-green-50 ring-2 ring-green-100"
                      : "border-stone-200 hover:border-green-300"
                  }`}
                  key={`${questionIndex}-${index}`}
                >
                  <input
                    checked={selectedAnswer === String(answer.id)}
                    className="h-4 w-4 accent-green-700"
                    disabled={isSubmitting || timerIsStarting || questionTimeRemaining === 0}
                    name={`question-${questionIndex}`}
                    onChange={() => setSelectedAnswer(String(answer.id))}
                    type="radio"
                    value={answer.id}
                  />
                  <span className="w-5 text-xs font-bold text-stone-500">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{answer.answer_content}</span>
                </label>
              ))}
            </fieldset>
            <button
              className="mt-6 w-full rounded-xl bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              disabled={isSubmitting || timerIsStarting}
              type="submit"
            >
              {isSubmitting
                ? "Zapisywanie…"
                : questionTimeRemaining === 0
                  ? "Czas minął — przejdź dalej"
                  : questionIndex === quiz.questions.length - 1
                    ? "Zakończ quiz"
                    : "Następne pytanie"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function PlayQuizPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-600 sm:px-8">
          Ładowanie quizu…
        </main>
      }
    >
      <PlayQuizContent />
    </Suspense>
  );
}
