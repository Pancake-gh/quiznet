import { getQuizzes } from "./local-data";
import { clearSession, getAccessToken } from "./auth-session";

const API_BASE_PATH = "/api/backend";
const IMPORTED_QUIZZES_KEY = "quiznet-db-imported-quizzes";
let legacyImportPromise = null;

export async function apiRequest(path, { body, ...options } = {}) {
  let response;
  const isFormBody = body instanceof URLSearchParams;
  const accessToken = getAccessToken();
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body === undefined
          ? {}
          : {
              "Content-Type": isFormBody
                ? "application/x-www-form-urlencoded"
                : "application/json",
            }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      body:
        body === undefined
          ? undefined
          : isFormBody
            ? body.toString()
            : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Nie można połączyć się z API. Uruchom backend.");
    }
    throw error;
  }

  const responseText = response.status === 204 ? "" : await response.text();
  let responseBody = null;
  let invalidJson = false;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      invalidJson = true;
    }
  } else if (response.status !== 204) {
    invalidJson = true;
  }

  if (!response.ok) {
    if (response.status === 401 && accessToken && !path.startsWith("/auth/")) {
      clearSession();
    }
    const detail = responseBody?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(" ")
      : detail;
    const invalidBody = invalidJson
      ? ` ${responseText.slice(0, 200)}`
      : "";
    throw new Error(message || `Błąd API (${response.status}).${invalidBody}`);
  }
  if (invalidJson) {
    throw new Error(`Nieprawidłowa odpowiedź API (${response.status}).`);
  }

  return responseBody;
}

async function performLegacyQuizImport() {
  if (!getAccessToken()) {
    return false;
  }

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
