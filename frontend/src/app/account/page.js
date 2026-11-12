import Link from "next/link";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900 sm:px-8">
      <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-green-700">Konto Quiznet</p>
        <h1 className="mt-2 text-3xl font-bold">Bedzie</h1>
        <p className="mt-3 leading-6 text-stone-600">
          Bedzie jak backend bedzie
        </p>
        <Link
          className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
          href="/"
        >
          Wróć
        </Link>
      </section>
    </main>
  );
}
