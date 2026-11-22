"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import {
  getAccessToken,
  subscribeToSessionChanges,
} from "../lib/auth-session";

function createQuestion(id) {
  return {
    id,
    text: "",
    answers: ["", "", "", ""],
    correctAnswer: 0,
  };
}

function formatReportDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function QuizEditor({ quizId = null } = {}) {
  const router = useRouter();
  const isEditing = quizId !== null;
  const nextQuestionId = useRef(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [questions, setQuestions] = useState([createQuestion(1)]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingQuiz, setDeletingQuiz] = useState(false);
  const [deleteQuizError, setDeleteQuizError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(isEditing);
  const [loadError, setLoadError] = useState("");
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(isEditing);
  const [reportsError, setReportsError] = useState("");
  const [reportDismissError, setReportDismissError] = useState("");
  const [reportDismissMessage, setReportDismissMessage] = useState("");
  const [dismissingReportId, setDismissingReportId] = useState(null);

  useEffect(() => {
    function syncAuthentication() {
      setIsAuthenticated(Boolean(getAccessToken()));
      setAuthChecked(true);
    }

    syncAuthentication();
    return subscribeToSessionChanges(syncAuthentication);
  }, []);

  useEffect(() => {
    if (!isEditing || !authChecked || !isAuthenticated) {
      return undefined;
    }

    let active = true;
    async function loadQuiz() {
      setLoadingQuiz(true);
      setLoadError("");
      try {
        const savedQuiz = await apiRequest(`/quiz/${quizId}/edit`);
        if (!active) {
          return;
        }
        setTitle(savedQuiz.quiz_name);
        setDescription(savedQuiz.description || "");
        setTimeLimit(savedQuiz.time_limit_seconds?.toString() || "");
        setRandomizeQuestions(savedQuiz.randomize_questions);
        const loadedQuestions = savedQuiz.questions.map((question) => ({
          id: question.id,
          text: question.question_content,
          answers: question.answers.map((answer) => answer.answer_content),
          correctAnswer: question.answers.findIndex((answer) => answer.is_correct),
        }));
        nextQuestionId.current = Math.max(
          ...loadedQuestions.map((question) => question.id),
          0,
        ) + 1;
        setQuestions(loadedQuestions);
      } catch (requestError) {
        if (active) {
          setLoadError(requestError.message);
        }
      } finally {
        if (active) {
          setLoadingQuiz(false);
        }
      }
    }

    loadQuiz();
    return () => {
      active = false;
    };
  }, [authChecked, isAuthenticated, isEditing, quizId]);

  useEffect(() => {
    if (!isEditing || !authChecked || !isAuthenticated) {
      return undefined;
    }

    let active = true;
    async function loadReports() {
      setReportsLoading(true);
      setReportsError("");
      try {
        const savedReports = await apiRequest(`/quiz/${quizId}/reports`);
        if (active) {
          setReports(savedReports);
        }
      } catch (requestError) {
        if (active) {
          setReportsError(requestError.message);
        }
      } finally {
        if (active) {
          setReportsLoading(false);
        }
      }
    }

    loadReports();
    return () => {
      active = false;
    };
  }, [authChecked, isAuthenticated, isEditing, quizId]);

  function updateQuestion(questionId, changes) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? { ...question, ...changes }
          : question,
      ),
    );
  }

  function updateAnswer(questionId, answerIndex, value) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
            ...question,
            answers: question.answers.map((answer, index) =>
              index === answerIndex ? value : answer,
            ),
          }
          : question,
      ),
    );
  }

  function addQuestion() {
    const newQuestion = createQuestion(nextQuestionId.current);
    nextQuestionId.current += 1;
    setQuestions((current) => [...current, newQuestion]);
  }

  function removeQuestion(questionId) {
    setQuestions((current) =>
      current.filter((question) => question.id !== questionId),
    );
  }

  async function dismissReport(reportId) {
    setDismissingReportId(reportId);
    setReportDismissError("");
    setReportDismissMessage("");
    try {
      await apiRequest(`/quiz/${quizId}/reports/${reportId}/dismiss`, {
        method: "PATCH",
      });
      setReports((current) => current.filter((report) => report.id !== reportId));
      setReportDismissMessage("Zgłoszenie zostało zamknięte.");
    } catch (requestError) {
      setReportDismissError(requestError.message);
    } finally {
      setDismissingReportId(null);
    }
  }

  async function deleteQuiz() {
    if (
      deletingQuiz ||
      saving ||
      !window.confirm("Czy na pewno chcesz trwale usunąć ten quiz? Tej operacji nie można cofnąć.")
    ) {
      return;
    }

    setDeletingQuiz(true);
    setDeleteQuizError("");
    try {
      await apiRequest(`/quiz/${quizId}`, { method: "DELETE" });
      router.replace("/account");
    } catch (requestError) {
      setDeleteQuizError(requestError.message);
      setDeletingQuiz(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || deletingQuiz) {
      return;
    }
    const hasInvalidQuestion = questions.some(
      (question) =>
        question.text.trim().length < 3 ||
        question.answers.some((answer) => !answer.trim()),
    );

    if (title.trim().length < 3 || hasInvalidQuestion) {
      setFormError(
        "Uzupełnij tytuł, treść każdego pytania i wszystkie cztery odpowiedzi.",
      );
      return;
    }

    setFormError("");
    setSaving(true);
    try {
      const savedQuiz = await apiRequest(
        isEditing ? `/quiz/${quizId}/edit` : "/quiz/create",
        {
          method: isEditing ? "PUT" : "POST",
          body: {
            quiz_name: title.trim(),
            description: description.trim() || null,
            time_limit_seconds: timeLimit === "" ? null : Number(timeLimit),
            randomize_questions: randomizeQuestions,
            questions: questions.map((question) => ({
              question_content: question.text.trim(),
              answers: question.answers.map((answer, answerIndex) => ({
                answer_content: answer.trim(),
                is_correct: answerIndex === question.correctAnswer,
              })),
            })),
          },
        },
      );
      router.push(isEditing ? "/account" : `/play/${savedQuiz.id}`);
    } catch (requestError) {
      setFormError(
        `Nie udało się zapisać quizu na serwerze. ${requestError.message}`,
      );
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-600 sm:px-8">
        <p className="mx-auto max-w-4xl" role="status">
          Sprawdzanie sesji…
        </p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900 sm:px-8">
        <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-green-700">Panel twórcy</p>
          <h1 className="mt-2 text-3xl font-bold">
            Zaloguj się, aby {isEditing ? "edytować quiz" : "stworzyć quiz"}
          </h1>
          <p className="mt-3 leading-6 text-stone-600">
            {isEditing
              ? "Edycja quizów jest dostępna dla zalogowanych użytkowników."
              : "Tworzenie quizów jest dostępne dla zalogowanych użytkowników."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
              href="/account"
            >
              Zaloguj się lub utwórz konto
            </Link>
            <Link
              className="inline-flex rounded-xl border border-stone-300 px-5 py-3 font-semibold text-stone-700 transition hover:bg-stone-50"
              href="/"
            >
              Wróć do quizów
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (loadingQuiz) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-600 sm:px-8">
        <p className="mx-auto max-w-4xl" role="status">
          Ładowanie quizu…
        </p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900 sm:px-8">
        <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">Nie udało się otworzyć quizu</h1>
          <p className="mt-3 text-red-700" role="alert">{loadError}</p>
          <Link className="mt-6 inline-flex font-semibold text-green-800 underline" href="/account">
            Wróć do konta
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <section className="mb-8">
          <p className="mb-2 text-sm font-semibold text-green-700">
            Panel twórcy
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {isEditing ? "Edytuj quiz" : "Stwórz własny quiz"}
          </h1>
          <p className="mt-3 max-w-2xl text-stone-600">
            {isEditing
              ? "Zmień informacje, pytania i odpowiedzi w swoim quizie."
              : "Dodaj pytania jednokrotnego wyboru, wpisz cztery odpowiedzi i wskaż jedną poprawną."}
          </p>
        </section>

        <form
          className="space-y-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8"
          id="create-quiz"
          onSubmit={handleSubmit}
        >
          <section aria-labelledby="quiz-details-heading">
            <h2
              className="mb-4 text-lg font-bold"
              id="quiz-details-heading"
            >
              Informacje o quizie
            </h2>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-stone-700">
                Tytuł quizu
                <input
                  autoComplete="off"
                  className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  maxLength={50}
                  minLength={3}
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  placeholder="Dodaj tytuł quizu"
                  required
                  value={title}
                />
              </label>

              <label className="block text-sm font-semibold text-stone-700">
                Opis <span className="font-normal text-stone-500">(opcjonalnie)</span>
                <textarea
                  className="mt-2 min-h-24 w-full resize-y rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  maxLength={200}
                  onChange={(event) => {
                    setDescription(event.target.value);
                  }}
                  placeholder="Opisz czego dotyczy quiz"
                  rows={3}
                  value={description}
                />
              </label>

              <label className="block text-sm font-semibold text-stone-700">
                Limit czasu na pytanie{" "}
                <span className="font-normal text-stone-500">(opcjonalnie, w sekundach)</span>
                <input
                  className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  min={1}
                  onChange={(event) => setTimeLimit(event.target.value)}
                  placeholder="Bez limitu"
                  step={1}
                  type="number"
                  value={timeLimit}
                />
                <span className="mt-1 block font-normal text-stone-500">
                  Ten sam limit będzie obowiązywał przy każdym pytaniu.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-4 text-sm text-stone-700">
                <input
                  checked={randomizeQuestions}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-green-700"
                  onChange={(event) => setRandomizeQuestions(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="block font-semibold">
                    Losuj kolejność pytań i odpowiedzi
                  </span>
                  <span className="mt-1 block text-stone-500">
                    Przy każdym uruchomieniu quizu pytania i odpowiedzi będą
                    wyświetlane w losowej kolejności.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section aria-labelledby="questions-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold" id="questions-heading">
                  Pytania
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Dla każdego pytania uzupełnij cztery odpowiedzi i zaznacz
                  poprawną.
                </p>
              </div>
              <span className="text-sm font-medium text-stone-500">
                {questions.length}{" "}
                {questions.length === 1
                  ? "pytanie"
                  : questions.length < 5
                    ? "pytania"
                    : "pytań"}
              </span>
            </div>

            <div className="space-y-5">
              {questions.map((question, questionIndex) => (
                <fieldset
                  className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-6"
                  key={question.id}
                >
                  <legend className="w-full font-bold">
                    <span className="inline-flex items-center gap-3">
                      Pytanie {questionIndex + 1}
                      {questions.length > 1 && (
                        <button
                          className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                          onClick={() => removeQuestion(question.id)}
                          type="button"
                        >
                          Usuń
                        </button>
                      )}
                    </span>
                  </legend>

                  <label className="mt-4 block text-sm font-medium text-stone-700">
                    Treść pytania
                    <input
                      className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                      maxLength={100}
                      minLength={3}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          text: event.target.value,
                        })
                      }
                      placeholder="Wpisz pytanie"
                      required
                      value={question.text}
                    />
                  </label>

                  <div className="mt-5">
                    <p className="mb-3 text-sm font-semibold text-stone-700">
                      Odpowiedzi{" "}
                      <span className="font-normal text-stone-500">
                        (wybierz poprawną)
                      </span>
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {question.answers.map((answer, answerIndex) => (
                        <label
                          className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 transition ${question.correctAnswer === answerIndex
                              ? "border-green-500 ring-2 ring-green-100"
                              : "border-stone-200"
                            }`}
                          key={answerIndex}
                        >
                          <input
                            aria-label={`Poprawna odpowiedź ${answerIndex + 1} dla pytania ${questionIndex + 1}`}
                            checked={question.correctAnswer === answerIndex}
                            className="h-4 w-4 shrink-0 cursor-pointer accent-green-700"
                            name={`correct-answer-${question.id}`}
                            onChange={() =>
                              updateQuestion(
                                question.id,
                                { correctAnswer: answerIndex },
                              )
                            }
                            type="radio"
                          />
                          <span className="w-5 shrink-0 text-xs font-bold text-stone-500">
                            {String.fromCharCode(65 + answerIndex)}
                          </span>
                          <input
                            aria-label={`Treść odpowiedzi ${answerIndex + 1} dla pytania ${questionIndex + 1}`}
                            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                            maxLength={120}
                            onChange={(event) =>
                              updateAnswer(
                                question.id,
                                answerIndex,
                                event.target.value,
                              )
                            }
                            placeholder={`Odpowiedź ${answerIndex + 1}`}
                            required
                            value={answer}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>

            <button
              className="mt-5 cursor-pointer rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-green-600 hover:text-green-800"
              onClick={addQuestion}
              type="button"
            >
              <span aria-hidden="true">＋</span> Dodaj pytanie
            </button>
          </section>

          <div className="border-t border-stone-200 pt-6">
            {formError && (
              <p className="mb-4 text-sm font-medium text-red-700" role="alert">
                {formError}
              </p>
            )}
            <button
              className="w-full cursor-pointer rounded-xl bg-green-700 px-6 py-3.5 font-bold text-white transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              disabled={saving || deletingQuiz}
              type="submit"
            >
              {saving
                ? "Zapisywanie…"
                : isEditing
                  ? "Zapisz zmiany"
                  : "Utwórz quiz"}
            </button>
            {isEditing && (
              <Link
                className="mt-4 inline-flex rounded-xl border border-stone-300 px-6 py-3.5 font-semibold text-stone-700 transition hover:bg-stone-50 sm:ml-3"
                href="/account"
              >
                Anuluj
              </Link>
            )}
          </div>
        </form>
        {isEditing && (
          <section
            aria-labelledby="question-reports-heading"
            className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8"
          >
            <h2 className="text-xl font-bold" id="question-reports-heading">
              Zgłoszenia od graczy
            </h2>
            {reportDismissMessage && (
              <p className="mt-4 text-sm font-medium text-green-800" role="status">
                {reportDismissMessage}
              </p>
            )}
            {reportDismissError && (
              <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
                Nie udało się zamknąć zgłoszenia. {reportDismissError}
              </p>
            )}
            {reportsError && (
              <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
                Nie udało się pobrać zgłoszeń. {reportsError}
              </p>
            )}
            {reportsLoading && (
              <p className="mt-4 text-sm text-stone-600" role="status">
                Ładowanie zgłoszeń…
              </p>
            )}
            {!reportsLoading && !reportsError && reports.length === 0 && (
              <p className="mt-4 text-sm text-stone-600">
                Nie ma aktywnych zgłoszeń do tego quizu.
              </p>
            )}
            {reports.length > 0 && (
              <ul className="mt-4 space-y-4">
                {reports.map((report) => (
                  <li
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                    key={report.id}
                  >
                    <h3 className="font-semibold">
                      Pytanie {report.question_number}: {report.question_content}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">
                      {report.details}
                    </p>
                    <p className="mt-2 text-xs text-stone-600">
                      Zgłosił: {report.reporter_name} · {formatReportDate(report.created_at)}
                    </p>
                    <button
                      className="mt-3 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                      disabled={dismissingReportId !== null}
                      onClick={() => dismissReport(report.id)}
                      type="button"
                    >
                      {dismissingReportId === report.id
                        ? "Zamykanie…"
                        : "Zamknij zgłoszenie"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {isEditing && (
          <section
            aria-labelledby="delete-quiz-heading"
            className="mt-8 rounded-3xl border border-red-200 bg-white p-5 shadow-sm sm:p-8"
          >
            <h2 className="text-xl font-bold text-red-800" id="delete-quiz-heading">
              Usuń quiz
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Tej operacji nie można cofnąć.
            </p>
            {deleteQuizError && (
              <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
                Nie udało się usunąć quizu. {deleteQuizError}
              </p>
            )}
            <button
              className="mt-4 cursor-pointer rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-800 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
              disabled={deletingQuiz || saving}
              onClick={deleteQuiz}
              type="button"
            >
              {deletingQuiz ? "Usuwanie quizu…" : "Usuń quiz"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
