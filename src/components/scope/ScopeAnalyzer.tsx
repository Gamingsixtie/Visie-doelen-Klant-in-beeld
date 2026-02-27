"use client";

import { useState } from "react";

interface ScopeItem {
  id: string;
  text: string;
  category: "out_of_scope" | "in_scope" | "unclear";
  source: string; // Respondent name
  conflictsWithGoals?: string[];
  suggestedClarification?: string;
}

interface ScopeCategory {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  items: ScopeItem[];
}

interface ScopeAnalyzerProps {
  items: ScopeItem[];
  approvedGoals?: string[];
  onItemsChange: (items: ScopeItem[]) => void;
  onCategoryChange?: (itemId: string, category: ScopeItem["category"]) => void;
}

export function ScopeAnalyzer({
  items,
  approvedGoals = [],
  onItemsChange,
  onCategoryChange
}: ScopeAnalyzerProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const categories: ScopeCategory[] = [
    {
      id: "out_of_scope",
      name: "Buiten scope",
      color: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-300",
      items: items.filter((i) => i.category === "out_of_scope")
    },
    {
      id: "in_scope",
      name: "Binnen scope",
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-300",
      items: items.filter((i) => i.category === "in_scope")
    },
    {
      id: "unclear",
      name: "Nog te bepalen",
      color: "text-gray-700",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-300",
      items: items.filter((i) => i.category === "unclear")
    }
  ];

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (category: ScopeItem["category"]) => {
    if (!draggedItem) return;

    const updatedItems = items.map((item) =>
      item.id === draggedItem ? { ...item, category } : item
    );
    onItemsChange(updatedItems);

    if (onCategoryChange) {
      onCategoryChange(draggedItem, category);
    }

    setDraggedItem(null);
  };

  const handleRemoveItem = (itemId: string) => {
    onItemsChange(items.filter((i) => i.id !== itemId));
  };

  const handleEditItem = (itemId: string, newText: string) => {
    onItemsChange(
      items.map((i) => (i.id === itemId ? { ...i, text: newText } : i))
    );
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-600">
          Sleep items naar de juiste categorie:
        </span>
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <span
              key={cat.id}
              className={`text-xs px-2 py-1 rounded ${cat.bgColor} ${cat.color}`}
            >
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* Category columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(category.id as ScopeItem["category"])}
            className={`min-h-[200px] p-4 rounded-lg border-2 ${category.borderColor} ${category.bgColor} transition-all ${
              draggedItem ? "border-dashed" : ""
            }`}
          >
            <h3 className={`font-semibold mb-3 ${category.color}`}>
              {category.name}
              <span className="text-sm font-normal ml-2 text-gray-500">
                ({category.items.length})
              </span>
            </h3>

            <div className="space-y-2">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={() => setDraggedItem(null)}
                  className={`p-3 bg-white rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing transition-all ${
                    draggedItem === item.id ? "opacity-50" : ""
                  } ${
                    item.conflictsWithGoals && item.conflictsWithGoals.length > 0
                      ? "ring-2 ring-red-300"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {expandedItem === item.id ? (
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => handleEditItem(item.id, e.target.value)}
                          onBlur={() => setExpandedItem(null)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && setExpandedItem(null)
                          }
                          autoFocus
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-cito-blue"
                        />
                      ) : (
                        <p
                          className="text-sm text-gray-800 cursor-text"
                          onClick={() => setExpandedItem(item.id)}
                        >
                          {item.text}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Bron: {item.source}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                        title="Verwijderen"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Conflict warning */}
                  {item.conflictsWithGoals &&
                    item.conflictsWithGoals.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                        <strong>Let op:</strong> Mogelijk conflict met doel(en):{" "}
                        {item.conflictsWithGoals.join(", ")}
                      </div>
                    )}

                  {/* Suggested clarification */}
                  {item.suggestedClarification && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      <strong>Suggestie:</strong> {item.suggestedClarification}
                    </div>
                  )}
                </div>
              ))}

              {category.items.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">
                  Sleep items hierheen
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Goals reference */}
      {approvedGoals.length > 0 && (
        <div className="p-4 bg-cito-light-blue rounded-lg">
          <h4 className="font-medium text-cito-blue mb-2">
            Goedgekeurde doelen (ter referentie)
          </h4>
          <ul className="text-sm text-gray-700 space-y-1">
            {approvedGoals.map((goal, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-cito-blue">•</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Summary component for the final scope list
interface ScopeSummaryProps {
  outOfScopeItems: string[];
  inScopeItems?: string[];
}

export function ScopeSummary({
  outOfScopeItems,
  inScopeItems = []
}: ScopeSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Out of scope */}
      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
        <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
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
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          Buiten scope ({outOfScopeItems.length})
        </h3>
        <ul className="space-y-2">
          {outOfScopeItems.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-gray-700">
              <span className="text-orange-600 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* In scope (optional) */}
      {inScopeItems.length > 0 && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            Binnen scope ({inScopeItems.length})
          </h3>
          <ul className="space-y-2">
            {inScopeItems.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700">
                <span className="text-green-600 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Quick add component for adding new scope items
interface ScopeQuickAddProps {
  onAdd: (text: string, category: ScopeItem["category"]) => void;
}

export function ScopeQuickAdd({ onAdd }: ScopeQuickAddProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ScopeItem["category"]>("out_of_scope");

  const handleSubmit = () => {
    if (text.trim()) {
      onAdd(text.trim(), category);
      setText("");
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-gray-700 mb-3">Item toevoegen</h4>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Beschrijf het scope-item..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cito-blue focus:border-cito-blue"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ScopeItem["category"])}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cito-blue focus:border-cito-blue"
        >
          <option value="out_of_scope">Buiten scope</option>
          <option value="in_scope">Binnen scope</option>
          <option value="unclear">Nog te bepalen</option>
        </select>
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="px-4 py-2 bg-cito-blue text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Toevoegen
        </button>
      </div>
    </div>
  );
}

export type { ScopeItem, ScopeCategory };
