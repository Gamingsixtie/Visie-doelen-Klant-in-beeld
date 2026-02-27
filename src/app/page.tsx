"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import type { StoredSession } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { existingSessions, loadSession, createNewSession, isLoading } = useSession();
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [sessionName, setSessionName] = useState("");

  // Find the most recent in-progress session
  const lastInProgressSession = existingSessions.find((s) => s.status === "in_progress");

  const handleCreateSession = () => {
    if (!sessionName.trim()) return;

    const session = createNewSession(sessionName.trim());
    router.push(`/sessies/${session.id}`);
  };

  const handleResumeSession = (session: StoredSession) => {
    loadSession(session.id);
    router.push(`/sessies/${session.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-cito-blue text-white py-6 px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold">Klant in Beeld</h1>
          <p className="text-blue-200 mt-1">Consolidatie App voor MT-canvassen</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Resume prompt if there's an in-progress session */}
          {lastInProgressSession && (
            <div className="bg-cito-light-blue border border-cito-blue/20 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-cito-blue mb-2">
                Lopende sessie gevonden
              </h2>
              <p className="text-gray-700 mb-4">
                Je hebt een sessie die nog niet is afgerond: <strong>{lastInProgressSession.name}</strong>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleResumeSession(lastInProgressSession)}
                  className="btn btn-primary"
                >
                  Doorgaan met sessie
                </button>
                <button
                  onClick={() => setShowNewSessionModal(true)}
                  className="btn btn-secondary"
                >
                  Nieuwe sessie starten
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* New Session Card */}
            <div
              onClick={() => setShowNewSessionModal(true)}
              className="card card-hover p-8 flex flex-col items-center text-center cursor-pointer"
            >
              <div className="w-16 h-16 bg-cito-light-green rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-cito-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nieuwe sessie starten
              </h3>
              <p className="text-gray-600 text-sm">
                Upload MT-canvassen en start met consolideren
              </p>
            </div>

            {/* View Sessions Card */}
            <div
              onClick={() => router.push("/sessies")}
              className="card card-hover p-8 flex flex-col items-center text-center cursor-pointer"
            >
              <div className="w-16 h-16 bg-cito-light-blue rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-cito-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Eerdere sessies
              </h3>
              <p className="text-gray-600 text-sm">
                Bekijk of hervat eerdere consolidatie-sessies
              </p>
            </div>
          </div>

          {/* Recent Sessions */}
          {existingSessions.length > 0 && (
            <div className="mt-12">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recente sessies
              </h2>
              <div className="space-y-2">
                {existingSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleResumeSession(session)}
                    className="card card-hover flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{session.name}</h4>
                      <p className="text-sm text-gray-500">
                        Laatst bijgewerkt:{" "}
                        {new Date(session.updatedAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {session.status === "completed" ? "Afgerond" : "In uitvoering"}
                      </span>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Nieuwe sessie starten
              </h2>
              <div className="mb-4">
                <label
                  htmlFor="sessionName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Sessienaam
                </label>
                <input
                  type="text"
                  id="sessionName"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="bijv. MT Sessie Klant in Beeld - Maart 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateSession();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowNewSessionModal(false);
                    setSessionName("");
                  }}
                  className="btn btn-secondary"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!sessionName.trim()}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Starten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-100 border-t py-4 px-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          Cito - Programma Klant in Beeld - Consolidatie App
        </div>
      </footer>
    </main>
  );
}
