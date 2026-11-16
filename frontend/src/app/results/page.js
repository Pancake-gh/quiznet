"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

function formatCompletionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ResultsPage() {
  const [leaderboards, setLeaderboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLeaderboards() {
      try {
        const quizzes = await apiRequest("/quiz");
        const quizResults = await Promise.all(
          quizzes.map(async (quiz) => ({
            quiz,
            results: await apiRequest(`/quiz/${quiz.id}/leaderboard`),
          })),
        );
        if (active) {
          setLeaderboards(quizResults);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLeaderboards();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold text-green-700">
            Najlepsze podejścia
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Tabela wyników</h1>
          <p className="mt-3 max-w-2xl text-stone-600">
            Zobacz, kto zdobył najwięcej punktów w każdym quizie.
          </p>
        </header>

        {error && (
          <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
            Nie udało się pobrać wyników. {error}
          </p>
        )}
        {loading && (
          <p className="text-sm text-stone-600" role="status">
            Ładowanie wyników…
          </p>
        )}
        {!loading && !error && leaderboards.length === 0 && (
          <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <p className="text-stone-600">
              Nie ma jeszcze quizów ani wyników. Stwórz pierwszy quiz!
            </p>
            <Link
              className="mt-4 inline-flex rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
              href="/create"
            >
              Stwórz quiz
            </Link>
          </section>
        )}

        {!loading && !error && leaderboards.length > 0 && (
          <div className="space-y-6">
            {leaderboards.map(({ quiz, results }) => (
              <section
                aria-labelledby={`quiz-${quiz.id}-heading`}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                id={`quiz-${quiz.id}`}
                key={quiz.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
                  <div>
                    <h2
                      className="text-lg font-bold"
                      id={`quiz-${quiz.id}-heading`}
                    >
                      {quiz.quiz_name}
                    </h2>
                    <p className="mt-1 text-sm text-stone-500">
                      Najlepsze podejścia
                    </p>
                  </div>
                  <Link
                    className="text-sm font-semibold text-green-800 underline decoration-green-200 underline-offset-4 hover:text-green-900"
                    href={`/play/${quiz.id}`}
                  >
                    Rozwiąż quiz
                  </Link>
                </div>

                {results.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-stone-600 sm:px-6">
                    Brak wyników. Bądź pierwszą osobą, która rozwiąże ten quiz!
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[34rem] text-left text-sm">
                      <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                        <tr>
                          <th className="px-5 py-3 font-semibold sm:px-6" scope="col">
                            Miejsce
                          </th>
                          <th className="px-5 py-3 font-semibold" scope="col">
                            Gracz
                          </th>
                          <th className="px-5 py-3 font-semibold" scope="col">
                            Wynik
                          </th>
                          <th className="px-5 py-3 font-semibold" scope="col">
                            Data
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {results.map((result, index) => (
                          <tr key={result.id}>
                            <td className="px-5 py-4 font-bold text-stone-700 sm:px-6">
                              {index + 1}
                            </td>
                            <td className="px-5 py-4 font-medium text-stone-900">
                              {result.player_name}
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-bold text-green-800">
                                {result.score}/{result.total_questions}
                              </span>
                              <span className="ml-2 text-stone-500">
                                ({Math.round((result.score / result.total_questions) * 100)}%)
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-stone-500">
                              {formatCompletionDate(result.completed_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
