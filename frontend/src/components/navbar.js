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
          className="cursor-pointer text-xl font-bold text-green-800"
          href="/"
        >
          Quiznet
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            className="cursor-pointer rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-800 sm:px-4"
            href="/create"
          >
            Stwórz quiz
          </Link>

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
