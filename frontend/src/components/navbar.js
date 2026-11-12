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
          <span
            aria-disabled="true"
            className="cursor-default rounded-lg px-3 py-2 text-sm font-medium text-stone-400"
          >
            Wyniki
          </span>
          <Link
            className="cursor-pointer rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-800 sm:px-4"
            href="/create"
          >
            Stwórz quiz
          </Link>
          <Link
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            href="/account"
          >
            Konto
          </Link>
        </div>
      </nav>
    </header>
  );
}
