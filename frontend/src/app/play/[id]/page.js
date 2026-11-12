"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getQuiz, saveResult } from "../../../lib/local-data";

function PlayQuizContent() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setQuiz(getQuiz(id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [id]);

  function startQuiz(event) {
    event.preventDefault();
    if (playerName.trim().length < 2) {
      setError("Wpisz nazwę gracza (co najmniej 2 znaki).");
      return;
    }
    setError("");
    setQuestionIndex(0);
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (selectedAnswer === "") {
      setError("Wybierz jedną odpowiedź.");
      return;
    }

    const currentQuestion = quiz.questions[questionIndex];
    const nextScore =
      score + (Number(selectedAnswer) === currentQuestion.correctAnswer ? 1 : 0);

    setError("");
    setSelectedAnswer("");

    if (questionIndex === quiz.questions.length - 1) {
      const completedResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        username: playerName.trim(),
        quiz_name: quiz.title,
        score: nextScore,
        total_questions: quiz.questions.length,
        completed_at: new Date().toISOString(),
      };
      try {
        saveResult(completedResult);
        setScore(nextScore);
        setResult(completedResult);
      } catch (requestError) {
        setError(`Nie udało się zapisać wyniku. ${requestError.message}`);
      }
      return;
    }

    setScore(nextScore);
    setQuestionIndex((current) => current + 1);
  }

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
            <h1 className="mt-2 text-3xl font-bold">{quiz.title}</h1>
            <p className="mt-6 text-5xl font-extrabold text-green-800">
              {result.score}
              <span className="text-2xl text-stone-500">/{result.total_questions}</span>
            </p>
            <p className="mt-3 text-stone-600">Gracz: {result.username}</p>
            <p className="mt-1 text-sm text-stone-500">
              Zapisano wynik.
            </p>
            <Link
              className="mt-7 inline-flex rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
              href="/"
            >
              Wróć do quizów
            </Link>
          </div>
        )}
        {quiz && !result && questionIndex < 0 && (
          <form
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
            onSubmit={startQuiz}
          >
            <p className="text-sm font-semibold text-green-700">Quiz</p>
            <h1 className="mt-2 text-3xl font-bold">{quiz.title}</h1>
            {quiz.description && <p className="mt-3 text-stone-600">{quiz.description}</p>}
            <p className="mt-5 text-sm text-stone-500">
              {quiz.questions.length} {quiz.questions.length === 1 ? "pytanie" : "pytań"}
            </p>
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
              Quiz może być zapisany w innej przeglądarce.
            </p>
            <Link className="mt-5 inline-block font-semibold text-green-800 underline" href="/">
              Wróć do listy quizów
            </Link>
          </div>
        )}
        {question && !result && (
          <form
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
            onSubmit={submitAnswer}
          >
            <div className="flex items-center justify-between gap-3 text-sm text-stone-500">
              <span>{quiz.title}</span>
              <span>{questionIndex + 1} / {quiz.questions.length}</span>
            </div>
            <h1 className="mt-5 text-2xl font-bold">{question.text}</h1>
            <fieldset className="mt-6 space-y-3">
              <legend className="sr-only">Wybierz odpowiedź</legend>
              {question.answers.map((answer, index) => (
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                    selectedAnswer === String(index)
                      ? "border-green-500 bg-green-50 ring-2 ring-green-100"
                      : "border-stone-200 hover:border-green-300"
                  }`}
                  key={`${questionIndex}-${index}`}
                >
                  <input
                    checked={selectedAnswer === String(index)}
                    className="h-4 w-4 accent-green-700"
                    name={`question-${questionIndex}`}
                    onChange={() => setSelectedAnswer(String(index))}
                    type="radio"
                    value={index}
                  />
                  <span className="w-5 text-xs font-bold text-stone-500">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{answer}</span>
                </label>
              ))}
            </fieldset>
            <button
              className="mt-6 w-full rounded-xl bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800 sm:w-auto"
              type="submit"
            >
              {questionIndex === quiz.questions.length - 1 ? "Zakończ quiz" : "Następne pytanie"}
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
