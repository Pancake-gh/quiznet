import { Suspense } from "react";
import QuizEditor from "../../../components/quiz-editor";

async function EditQuizContent({ params }) {
  const { id } = await params;
  return <QuizEditor quizId={id} />;
}

export default function EditQuizPage({ params }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-600 sm:px-8">
          Ładowanie quizu…
        </main>
      }
    >
      <EditQuizContent params={params} />
    </Suspense>
  );
}
