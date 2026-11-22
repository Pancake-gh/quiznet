"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import {
  clearSession,
  getSessionUsername,
  saveSession,
} from "../../lib/auth-session";

export default function AccountPage() {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signedInUsername, setSignedInUsername] = useState("");
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [quizzesError, setQuizzesError] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSignedInUsername(getSessionUsername() || "");
  }, []);

  useEffect(() => {
    if (!signedInUsername) {
      return undefined;
    }

    let active = true;
    setQuizzesLoading(true);
    setQuizzesError("");
    apiRequest("/quiz/mine")
      .then((quizzes) => {
        if (active) {
          setMyQuizzes(quizzes);
        }
      })
      .catch((requestError) => {
        if (active) {
          setQuizzesError(requestError.message);
        }
      })
      .finally(() => {
        if (active) {
          setQuizzesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [signedInUsername]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const normalizedUsername = username.trim();
      const session =
        mode === "signin"
          ? await apiRequest("/auth/signin", {
              method: "POST",
              body: new URLSearchParams({
                username: normalizedUsername,
                password,
              }),
            })
          : await apiRequest("/auth/signup", {
              method: "POST",
              body: {
                username: normalizedUsername,
                password,
              },
            });

      saveSession(session.access_token, normalizedUsername);
      setSignedInUsername(normalizedUsername);
      setPassword("");
    } catch (requestError) {
      const messages = {
        "Incorrect username or password": "Nieprawidłowa nazwa użytkownika lub hasło.",
        "Username already exists": "Ta nazwa użytkownika jest już zajęta.",
      };
      setError(messages[requestError.message] || requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignOut() {
    clearSession();
    setSignedInUsername("");
    setMyQuizzes([]);
    setQuizzesError("");
    setUsername("");
    setPassword("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900 sm:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-green-700">Konto Quiznet</p>
        {signedInUsername ? (
          <>
            <h1 className="mt-2 text-3xl font-bold">Witaj, {signedInUsername}!</h1>
            <p className="mt-3 leading-6 text-stone-600">
              Jesteś zalogowany. Sesja będzie aktywna w tej karcie przeglądarki.
            </p>
            <section
              aria-labelledby="my-quizzes-heading"
              className="mt-8 border-t border-stone-200 pt-6"
            >
              <h2 className="text-xl font-bold" id="my-quizzes-heading">
                Twoje quizy
              </h2>
              {quizzesError && (
                <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
                  Nie udało się pobrać Twoich quizów. {quizzesError}
                </p>
              )}
              {quizzesLoading && (
                <p className="mt-4 text-sm text-stone-600" role="status">
                  Ładowanie Twoich quizów…
                </p>
              )}
              {!quizzesLoading && !quizzesError && myQuizzes.length === 0 && (
                <p className="mt-4 text-sm text-stone-600">
                  Nie masz jeszcze quizów.{" "}
                  <Link className="font-semibold text-green-800 underline" href="/create">
                    Utwórz swój pierwszy quiz
                  </Link>
                  .
                </p>
              )}
              {myQuizzes.length > 0 && (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {myQuizzes.map((quiz) => (
                    <li
                      className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                      key={quiz.id}
                    >
                      <h3 className="font-semibold">{quiz.quiz_name}</h3>
                      <p className="mt-1 text-sm text-stone-600">
                        {quiz.question_count}{" "}
                        {quiz.question_count === 1 ? "pytanie" : "pytań"}
                      </p>
                      {quiz.report_count > 0 && (
                        <p className="mt-1 text-sm font-medium text-amber-800">
                          {quiz.report_count}{" "}
                          {quiz.report_count === 1
                            ? "zgłoszenie"
                            : quiz.report_count < 5
                              ? "zgłoszenia"
                              : "zgłoszeń"}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-4">
                        <Link
                          className="font-semibold text-green-800 underline decoration-green-200 underline-offset-4 hover:text-green-900"
                          href={`/play/${quiz.id}`}
                        >
                          Otwórz quiz
                        </Link>
                        <Link
                          className="font-semibold text-green-800 underline decoration-green-200 underline-offset-4 hover:text-green-900"
                          href={`/edit/${quiz.id}`}
                        >
                          Edytuj quiz
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                className="cursor-pointer rounded-xl border border-stone-300 px-5 py-3 font-semibold text-stone-700 transition hover:bg-stone-50"
                onClick={handleSignOut}
                type="button"
              >
                Wyloguj się
              </button>
              <Link
                className="font-semibold text-green-800 underline decoration-green-200 underline-offset-4 hover:text-green-900"
                href="/"
              >
                Wróć do quizów
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-3xl font-bold">
              {mode === "signin" ? "Zaloguj się" : "Utwórz konto"}
            </h1>
            <p className="mt-3 leading-6 text-stone-600">
              {mode === "signin"
                ? "Zaloguj się, aby korzystać z konta Quiznet."
                : "Załóż konto, aby dołączyć do Quiznet."}
            </p>

            <div
              aria-label="Wybierz sposób"
              className="mt-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1"
              role="group"
            >
              <button
                aria-pressed={mode === "signin"}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === "signin"
                    ? "bg-white text-green-800 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
                onClick={() => {
                  setMode("signin");
                  setError("");
                }}
                type="button"
              >
                Logowanie
              </button>
              <button
                aria-pressed={mode === "signup"}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === "signup"
                    ? "bg-white text-green-800 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                type="button"
              >
                Rejestracja
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-semibold text-stone-700">
                Nazwa użytkownika
                <input
                  autoComplete="username"
                  className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  maxLength={20}
                  minLength={3}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  value={username}
                />
              </label>

              <label className="block text-sm font-semibold text-stone-700">
                Hasło
                <input
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  minLength={mode === "signup" ? 8 : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
                {mode === "signup" && (
                  <span className="mt-1 block font-normal text-stone-500">
                    Co najmniej 8 znaków.
                  </span>
                )}
              </label>

              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}

              <button
                className="w-full cursor-pointer rounded-xl bg-green-700 px-5 py-3 font-bold text-white transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:cursor-wait disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? "Chwila…"
                  : mode === "signin"
                    ? "Zaloguj się"
                    : "Utwórz konto"}
              </button>
            </form>
          </>
        )}

        {!signedInUsername && (
          <Link
            className="mt-6 inline-flex font-semibold text-green-800 underline decoration-green-200 underline-offset-4 hover:text-green-900"
            href="/"
          >
            Wróć do quizów
          </Link>
        )}
      </section>
    </main>
  );
}
