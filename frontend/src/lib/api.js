import { getQuizzes } from "./local-data";

const API_BASE_PATH = "/api/backend";
const IMPORTED_QUIZZES_KEY = "quiznet-db-imported-quizzes";
let legacyImportPromise = null;

export async function apiRequest(path, { body, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Nie można połączyć się z API. Uruchom backend.");
    }
    throw error;
  }

  const responseBody = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const detail = responseBody?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(" ")
      : detail;
    throw new Error(message || `Błąd API (${response.status}).`);
  }

  return responseBody;
}

async function performLegacyQuizImport() {
  const quizzes = getQuizzes();
  const storedIds = window.localStorage.getItem(IMPORTED_QUIZZES_KEY);
  let importedIds = [];
  if (storedIds) {
    importedIds = JSON.parse(storedIds);
    if (!Array.isArray(importedIds)) {
      throw new Error("Nieprawidłowy rejestr przeniesionych quizów.");
    }
  }

  const imported = new Set(importedIds);
  let hasImportedQuizzes = false;
  for (const quiz of quizzes) {
    const legacyId = String(quiz.id);
    if (imported.has(legacyId)) {
      continue;
    }

    await apiRequest("/quiz/create", {
      method: "POST",
      body: {
        quiz_name: quiz.title,
        description: quiz.description || null,
        questions: quiz.questions.map((question) => ({
          question_content: question.text,
          answers: question.answers.map((answer, answerIndex) => ({
            answer_content: answer,
            is_correct: answerIndex === question.correctAnswer,
          })),
        })),
      },
    });
    imported.add(legacyId);
    importedIds = [...imported];
    window.localStorage.setItem(IMPORTED_QUIZZES_KEY, JSON.stringify(importedIds));
    hasImportedQuizzes = true;
  }

  return hasImportedQuizzes;
}

export function importLegacyQuizzes() {
  if (!legacyImportPromise) {
    legacyImportPromise = performLegacyQuizImport().finally(() => {
      legacyImportPromise = null;
    });
  }
  return legacyImportPromise;
}
