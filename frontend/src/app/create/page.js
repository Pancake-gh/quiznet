"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuiz } from "../../lib/local-data";

function createQuestion(id) {
  return {
    id,
    text: "",
    answers: ["", "", "", ""],
    correctAnswer: 0,
  };
}

export default function CreateQuizPage() {
  const router = useRouter();
  const nextQuestionId = useRef(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([createQuestion(1)]);
  const [formError, setFormError] = useState("");

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

  function handleSubmit(event) {
    event.preventDefault();
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
    try {
      const createdQuiz = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: title.trim(),
        description: description.trim(),
        questions: questions.map((question) => ({
          text: question.text.trim(),
          answers: question.answers.map((answer) => answer.trim()),
          correctAnswer: question.correctAnswer,
        })),
      };
      saveQuiz(createdQuiz);
      router.push(`/play/${createdQuiz.id}`);
    } catch (requestError) {
      setFormError(
        `Nie udało się zapisać quizu w tej przeglądarce. ${requestError.message}`,
      );
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <section className="mb-8">
          <p className="mb-2 text-sm font-semibold text-green-700">
            Panel twórcy
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Stwórz własny quiz
          </h1>
          <p className="mt-3 max-w-2xl text-stone-600">
            Dodaj pytania jednokrotnego wyboru, wpisz cztery odpowiedzi i
            wskaż jedną poprawną.
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
              className="w-full cursor-pointer rounded-xl bg-green-700 px-6 py-3.5 font-bold text-white transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 sm:w-auto"
              type="submit"
            >
              Utwórz quiz
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
