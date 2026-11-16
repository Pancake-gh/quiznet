"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getSessionUsername,
  subscribeToSessionChanges,
} from "../lib/auth-session";

export default function Navbar() {
  const [username, setUsername] = useState("");

  useEffect(() => {
    function syncUsername() {
      setUsername(getSessionUsername() || "");
    }

    syncUsername();
    return subscribeToSessionChanges(syncUsername);
  }, []);

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
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            href="/results"
          >
            Wyniki
          </Link>
          <Link
            className="cursor-pointer rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-800 sm:px-4"
            href="/create"
          >
            Stwórz quiz
          </Link>
          <Link
            aria-label={username ? `Konto użytkownika ${username}` : "Konto"}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            href="/account"
          >
            {username || "Konto"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
