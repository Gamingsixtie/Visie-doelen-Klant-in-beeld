"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/session-context";
import * as persistence from "@/lib/persistence";
import type { StoredSession } from "@/lib/types";

export default function SessiesPage() {
  const router = useRouter();
  const { existingSessions, loadSession, createNewSession, refreshSessions } = useSession();
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreateSession = () => {
    if (!sessionName.trim()) return;
    const session = createNewSession(sessionName.trim());
    router.push(`/sessies/${session.id}`);
  };

  const handleOpenSession = (session: StoredSession) => {
    loadSession(session.id);
    router.push(`/sessies/${session.id}`);
  };

  const handleDeleteSession = (sessionId: string) => {
    persistence.deleteSession(sessionId);
    refreshSessions();
    setDeleteConfirm(null);
  };

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-cito-blue text-white py-6 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
            <div>
              <h1 className="text-2xl font-bold">Sessies</h1>
              <p className="text-blue-200">Beheer je consolidatie-sessies</p>
            </div>
          </div>

          <button
            onClick={() => setShowNewSessionModal(true)}
            className="btn bg-white text-cito-blue hover:bg-gray-100"
          >
            + Nieuwe sessie
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {existingSessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-gray-400"
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Nog geen sessies
              </h2>
              <p className="text-gray-600 mb-6">
                Start je eerste consolidatie-sessie om MT-canvassen te analyseren.
              </p>
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="btn btn-primary"
              >
                Eerste sessie starten
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {existingSessions.map((session) => (
                <div
                  key={session.id}
                  className="card flex items-center justify-between"
                >
                  <div
                    onClick={() => handleOpenSession(session)}
                    className="flex-1 cursor-pointer hover:bg-gray-50 -m-4 p-4 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          session.status === "completed"
                            ? "bg-cito-green"
                            : "bg-yellow-500"
                        }`}
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {session.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Aangemaakt:{" "}
                          {new Date(session.createdAt).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                          {" • "}
                          Laatst bijgewerkt:{" "}
                          {new Date(session.updatedAt).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        session.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {session.status === "completed" ? "Afgerond" : "In uitvoering"}
                    </span>

                    {deleteConfirm === session.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Verwijderen
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        >
                          Annuleren
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(session.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Verwijderen"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenSession(session)}
                      className="p-2 text-gray-400 hover:text-cito-blue hover:bg-cito-light-blue rounded"
                      title="Openen"
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
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
    </main>
  );
}
