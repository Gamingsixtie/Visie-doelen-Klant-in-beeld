"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { useToast, ConfirmDialog } from "@/components/ui";
import { RefineWithAI } from "@/components/ui/RefineWithAI";

interface ScopeStepProps {
  onComplete: () => void;
}

interface ScopeItem {
  id: string;
  text: string;
  source: string;
}

export function ScopeStep({ onComplete }: ScopeStepProps) {
  const { documents, getApprovedText, saveApprovedText, removeApprovedText, updateFlowState, flowState } = useSession();
  const { showToast } = useToast();
  const [isApproved, setIsApproved] = useState(false);
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Get all approved goals for reference (3-5 doelen)
  const approvedGoals: string[] = [];
  const goalKeys = ["goal_1", "goal_2", "goal_3", "goal_4", "goal_5"] as const;
  goalKeys.forEach((key) => {
    const goal = getApprovedText(key);
    if (goal) approvedGoals.push(goal.text);
  });

  // Check if already approved
  useEffect(() => {
    const approved = getApprovedText("out_of_scope");
    if (approved) {
      setIsApproved(true);
    }
  }, [getApprovedText]);

  // Collect initial scope items from documents
  useEffect(() => {
    const items: ScopeItem[] = [];
    let idCounter = 0;

    documents.forEach((doc) => {
      if (doc.parsedResponses.out_of_scope) {
        const parts = doc.parsedResponses.out_of_scope
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        parts.forEach((text) => {
          // Check for duplicates
          const exists = items.some(
            (i) => i.text.toLowerCase() === text.toLowerCase()
          );
          if (!exists) {
            items.push({
              id: `scope-${idCounter++}`,
              text,
              source: doc.filename.replace(".docx", "")
            });
          }
        });
      }
    });

    setScopeItems(items);
  }, [documents]);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ScopeItem = {
      id: `scope-${Date.now()}`,
      text: newItemText.trim(),
      source: "Handmatig toegevoegd"
    };
    setScopeItems([...scopeItems, newItem]);
    setNewItemText("");
    showToast("Item toegevoegd", "success");
  };

  const handleRemoveItem = (id: string) => {
    setScopeItems(scopeItems.filter((item) => item.id !== id));
  };

  const handleEditStart = (item: ScopeItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleEditSave = () => {
    if (!editingId || !editText.trim()) return;

    setScopeItems(
      scopeItems.map((item) =>
        item.id === editingId ? { ...item, text: editText.trim() } : item
      )
    );
    setEditingId(null);
    setEditText("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleApprove = () => {
    if (scopeItems.length === 0) {
      showToast("Voeg minstens één item toe", "warning");
      return;
    }

    const scopeText = scopeItems.map((item) => `• ${item.text}`).join("\n");
    saveApprovedText("out_of_scope", scopeText, "scope", "scope-final");

    updateFlowState({
      scope: { ...flowState.scope, status: "approved" }
    });

    setIsApproved(true);
    showToast("Scope kaders succesvol vastgesteld!", "success");
    onComplete();
  };

  const approved = getApprovedText("out_of_scope");

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Scope Afbakening
              </h1>
              <p className="text-gray-600">
                Bepaal wat <strong>buiten scope</strong> valt om de kaders te bepalen
              </p>
            </div>
          </div>
        </div>

        {/* Already approved state */}
        {isApproved && approved ? (
          <div className="space-y-6 animate-fade-in">
            <div className="card bg-green-50 border-2 border-green-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-green-800 mb-4">
                    Scope Kaders Vastgesteld
                  </h2>
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Buiten scope:</h3>
                    <div className="text-gray-800 whitespace-pre-line bg-white rounded-lg p-4">
                      {approved.text}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => {
                  removeApprovedText("out_of_scope");
                  setIsApproved(false);
                  showToast("Scope vrijgegeven voor bewerking", "info");
                }}
                className="btn btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Bewerken
              </button>
              <button onClick={onComplete} className="btn btn-primary flex items-center gap-2">
                Naar export
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info card */}
            <div className="card bg-orange-50 border-orange-200">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-orange-800">Wat hoort hier niet bij?</h3>
                  <p className="text-orange-700 text-sm mt-1">
                    Door duidelijk te bepalen wat <strong>buiten scope</strong> valt, ontstaat helderheid over de kaders van het programma.
                    Dit voorkomt scope creep en houdt de focus scherp.
                  </p>
                </div>
              </div>
            </div>

            {/* Goals reference */}
            {approvedGoals.length > 0 && (
              <div className="card bg-cito-light-blue">
                <h3 className="font-semibold text-cito-blue mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Goedgekeurde doelen (ter referentie)
                </h3>
                <ul className="space-y-2">
                  {approvedGoals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="w-6 h-6 bg-cito-blue text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm">{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Out of scope items */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Buiten Scope ({scopeItems.length} items)
              </h2>

              {scopeItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Nog geen items toegevoegd</p>
                  <p className="text-sm">Voeg items toe die buiten scope vallen</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {scopeItems.map((item, index) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200 animate-slide-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                        {index + 1}
                      </div>

                      {editingId === item.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cito-blue"
                            autoFocus
                          />
                          <button
                            onClick={handleEditSave}
                            className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            aria-label="Wijziging opslaan"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            aria-label="Wijziging annuleren"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="text-gray-800">{item.text}</p>
                            <p className="text-xs text-gray-500 mt-1">Bron: {item.source}</p>
                            <RefineWithAI
                              currentText={item.text}
                              context="Scope-afbakening: item dat buiten scope valt voor het programma Klant in Beeld"
                              onRefined={(newText) => {
                                setScopeItems(
                                  scopeItems.map((si) =>
                                    si.id === item.id ? { ...si, text: newText } : si
                                  )
                                );
                              }}
                              label="Verfijn formulering"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditStart(item)}
                              className="p-2 text-gray-400 hover:text-cito-blue rounded transition-colors"
                              title="Bewerken"
                              aria-label="Scope-item bewerken"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 rounded transition-colors"
                              title="Verwijderen"
                              aria-label="Scope-item verwijderen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Add new item */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label htmlFor="new-scope-item" className="block text-sm font-medium text-gray-700 mb-2">
                  Nieuw item toevoegen
                </label>
                <div className="flex gap-2">
                  <input
                    id="new-scope-item"
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    placeholder="Wat valt buiten scope?"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cito-blue focus:border-cito-blue"
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemText.trim()}
                    className="btn btn-primary disabled:opacity-50"
                    aria-label="Item toevoegen"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end">
              <button
                onClick={handleApprove}
                disabled={scopeItems.length === 0}
                className="btn btn-success text-lg px-8 py-3 flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Scope Kaders Goedkeuren
              </button>
            </div>
          </div>
        )}
        {/* Delete confirmation dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmId !== null}
          title="Item verwijderen"
          message="Weet je zeker dat je dit scope-item wilt verwijderen?"
          confirmLabel="Verwijderen"
          variant="danger"
          onConfirm={() => {
            if (deleteConfirmId) handleRemoveItem(deleteConfirmId);
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      </div>
    </div>
  );
}
