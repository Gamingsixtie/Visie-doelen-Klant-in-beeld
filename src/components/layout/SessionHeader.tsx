"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";

interface SessionHeaderProps {
  showBackButton?: boolean;
}

export function SessionHeader({ showBackButton = true }: SessionHeaderProps) {
  const router = useRouter();
  const { currentSession, closeSession } = useSession();

  const handleBack = () => {
    closeSession();
    router.push("/");
  };

  if (!currentSession) {
    return null;
  }

  return (
    <header className="bg-cito-blue text-white py-4 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Terug naar home"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold">Klant in Beeld</h1>
            <p className="text-blue-200 text-sm">{currentSession.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentSession.status === "completed"
                ? "bg-green-500 text-white"
                : "bg-yellow-500 text-yellow-900"
            }`}
          >
            {currentSession.status === "completed" ? "Afgerond" : "In uitvoering"}
          </span>
        </div>
      </div>
    </header>
  );
}
