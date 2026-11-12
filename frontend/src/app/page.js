"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getQuizzes } from "../lib/local-data";

export default function Home() {
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setQuizzes(getQuizzes());
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <section className="py-8 sm:py-2">
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-green-700">
              Czas na małe wyzwanie
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">Wybierz quiz</h1>
            <p className="mt-2 text-sm text-stone-600">
              Odkrywaj ciekawe tematy i sprawdzaj swoją wiedzę.
            </p>
          </div>

          <div className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
            <div className="relative flex items-start gap-4">
              <span aria-hidden="true" className="text-2xl">✨</span>
              <div>
                <h2 className="font-bold text-stone-900">Podziel się swoją wiedzą</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Stwórz quiz z pytaniami jednokrotnego wyboru.
                </p>
              </div>
            </div>
            <Link
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-green-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 focus:outline-none focus:ring-4 focus:ring-green-200"
              href="/create"
            >
              Stwórz quiz <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold">Dostępne quizy</h2>
            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
                Nie udało się odczytać quizów. {error}
              </p>
            )}
            {!error && quizzes.length === 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
                <p>Nie ma jeszcze quizów. Stwórz pierwszy!</p>
                <Link className="mt-3 inline-block font-semibold text-green-800 underline" href="/create">
                  Utwórz quiz
                </Link>
              </div>
            )}
            {quizzes.length > 0 && (
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quiz) => (
                  <article
                    className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                    key={quiz.id}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      {quiz.questions.length}{" "}
                      {quiz.questions.length === 1 ? "pytanie" : "pytań"}
                    </span>
                    <h3 className="mt-3 text-lg font-bold">{quiz.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">
                      {quiz.description || "Sprawdź swoją wiedzę w tym quizie."}
                    </p>
                    <Link
                      className="mt-5 rounded-xl bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800"
                      href={`/play/${quiz.id}`}
                    >
                      Rozwiąż quiz
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
