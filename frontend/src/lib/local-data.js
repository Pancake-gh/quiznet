const QUIZZES_KEY = "quiznet-quizzes";
const RESULTS_KEY = "quiznet-results";

function readItems(key) {
  const value = window.localStorage.getItem(key);
  if (!value) {
    return [];
  }

  try {
    const items = JSON.parse(value);
    if (!Array.isArray(items)) {
      throw new Error("Nieprawidłowy format danych.");
    }
    return items;
  } catch {
    throw new Error("Nie można odczytać danych.");
  }
}

export function getQuizzes() {
  return readItems(QUIZZES_KEY);
}

export function getQuiz(id) {
  return getQuizzes().find((quiz) => quiz.id === id) || null;
}

export function saveQuiz(quiz) {
  const quizzes = getQuizzes();
  quizzes.unshift(quiz);
  window.localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

export function getResults() {
  return readItems(RESULTS_KEY);
}

export function saveResult(result) {
  const results = getResults();
  results.push(result);
  window.localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}
