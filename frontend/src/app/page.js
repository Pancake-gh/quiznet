import Link from "next/link";

export default function Home() {
  const cardColors = [
    "from-emerald-100 via-green-50 to-white",
    "from-sky-100 via-cyan-50 to-white",
    "from-violet-100 via-fuchsia-50 to-white",
  ];

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
            <div
              aria-hidden="true"
              className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-green-200/30 blur-2xl"
            />
            <div className="relative flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm"
              >
                ✨
              </span>
              <div>
                <h2 className="font-bold text-stone-900">
                  Podziel się swoją wiedzą
                </h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Stwórz swój pierwszy quiz.
                </p>
              </div>
            </div>
            <Link
              className="group relative inline-flex shrink-0 items-center justify-center rounded-xl bg-green-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 focus:outline-none focus:ring-4 focus:ring-green-200"
              href="/create"
            >
              Stwórz quiz
              <span
                aria-hidden="true"
                className="ml-2 transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>

          <div
            aria-label="Przykładowy układ quizów"
            className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[0, 1, 2].map((card) => (
              <article
                aria-hidden="true"
                className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
                key={card}
              >
                <div
                  className={`flex h-36 items-center justify-center bg-gradient-to-br ${cardColors[card]}`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/70 shadow-sm backdrop-blur">
                    <span className="h-6 w-6 rounded-lg bg-stone-200/80" />
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-20 rounded-full bg-green-50" />
                    <div className="h-4 w-16 rounded bg-stone-100" />
                  </div>
                  <div className="mt-5 h-5 w-3/4 rounded-md bg-stone-100" />
                  <div className="mt-3 h-3.5 w-full rounded-md bg-stone-50" />
                  <div className="mt-2 h-3.5 w-2/3 rounded-md bg-stone-50" />
                  <div className="mt-5 h-11 rounded-xl bg-stone-100" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
