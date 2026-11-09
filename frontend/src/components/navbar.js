import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <nav
        aria-label="Nawigacja główna"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8"
      >
        <Link
          aria-label="Quiznet — strona główna"
          className="text-xl font-bold text-green-800"
          href="/"
        >
          Quiznet
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <button
            className="cursor-not-allowed rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-400 sm:px-4"
            disabled
            type="button"
          >
            Stwórz quiz
          </button>

          <div
            aria-label="Profil użytkownika: Gość"
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800"
            >
              G
            </span>
            <span className="hidden text-sm font-medium text-stone-700 sm:inline">
              Gość
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}
