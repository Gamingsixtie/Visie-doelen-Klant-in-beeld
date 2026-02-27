"use client";

import { useState } from "react";
import type { ProposalVariant, Vote, VoteValue } from "@/lib/types";
import { VoteButtons } from "./VoteButtons";
import { ConsentBadge } from "./ConsentStatus";

interface ProposalCardProps {
  variant: ProposalVariant;
  isSelected?: boolean;
  isRecommended?: boolean;
  votes?: Vote[];
  totalVoters?: number;
  onSelect?: () => void;
  onVote?: (value: VoteValue, comment?: string) => void;
  currentVote?: VoteValue;
  editable?: boolean;
  onEdit?: (text: string) => void;
  showVoting?: boolean;
}

export function ProposalCard({
  variant,
  isSelected = false,
  isRecommended = false,
  votes = [],
  totalVoters = 1,
  onSelect,
  onVote,
  currentVote,
  editable = false,
  onEdit,
  showVoting = false
}: ProposalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(variant.text);

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(editedText);
    }
    setIsEditing(false);
  };

  const typeLabels: Record<string, { label: string; icon: string }> = {
    beknopt: { label: "Beknopt", icon: "📝" },
    volledig: { label: "Volledig", icon: "📄" },
    gebalanceerd: { label: "Gebalanceerd", icon: "⚖️" }
  };

  const typeInfo = typeLabels[variant.type] || { label: variant.type, icon: "📋" };

  return (
    <div
      className={`rounded-lg border-2 transition-all ${
        isSelected
          ? "border-cito-blue bg-cito-light-blue shadow-md"
          : "border-gray-200 hover:border-cito-blue/50 bg-white"
      } ${onSelect ? "cursor-pointer" : ""}`}
      onClick={() => !isEditing && onSelect?.()}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeInfo.icon}</span>
          <span className="font-medium text-gray-700">{typeInfo.label}</span>
          {isRecommended && (
            <span className="px-2 py-0.5 bg-cito-blue text-white text-xs rounded-full">
              Aanbevolen
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {votes.length > 0 && (
            <ConsentBadge votes={votes} totalVoters={totalVoters} />
          )}

          {isSelected && (
            <div className="w-6 h-6 bg-cito-blue rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
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
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue"
              rows={4}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit();
                }}
                className="px-3 py-1 bg-cito-blue text-white text-sm rounded hover:bg-blue-800"
              >
                Opslaan
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditedText(variant.text);
                  setIsEditing(false);
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
              >
                Annuleren
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-800 leading-relaxed">{variant.text}</p>

            {/* Edit button */}
            {editable && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="mt-2 text-sm text-cito-blue hover:underline flex items-center gap-1"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                Tekst aanpassen
              </button>
            )}
          </>
        )}
      </div>

      {/* Emphasis */}
      {variant.emphasizes && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Benadrukt:</span> {variant.emphasizes}
          </p>
        </div>
      )}

      {/* Included themes */}
      {variant.includesThemes && variant.includesThemes.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200">
          <div className="flex flex-wrap gap-1">
            {variant.includesThemes.map((theme, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-cito-light-blue text-cito-blue text-xs rounded"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Voting section */}
      {showVoting && onVote && (
        <div
          className="px-4 py-3 border-t border-gray-200 bg-gray-50"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium text-gray-700 mb-2">
            Stem op dit voorstel:
          </p>
          <VoteButtons
            onVote={onVote}
            currentVote={currentVote}
          />
        </div>
      )}
    </div>
  );
}

// Proposal list with tabs
interface ProposalTabsProps {
  variants: ProposalVariant[];
  selectedId?: string;
  recommendedType?: string;
  onSelect: (variantId: string) => void;
  editable?: boolean;
  onEditVariant?: (variantId: string, text: string) => void;
}

export function ProposalTabs({
  variants,
  selectedId,
  recommendedType,
  onSelect,
  editable = false,
  onEditVariant
}: ProposalTabsProps) {
  const [activeTab, setActiveTab] = useState(
    variants.find((v) => v.type === recommendedType)?.id || variants[0]?.id
  );

  const activeVariant = variants.find((v) => v.id === activeTab);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Tab headers */}
      <div className="flex border-b bg-gray-50">
        {variants.map((variant) => {
          const isActive = activeTab === variant.id;
          const isSelected = selectedId === variant.id;
          const isRecommended = variant.type === recommendedType;

          return (
            <button
              key={variant.id}
              onClick={() => setActiveTab(variant.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                isActive
                  ? "bg-white text-cito-blue border-b-2 border-cito-blue -mb-px"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              <span className="capitalize">{variant.type}</span>
              {isRecommended && (
                <span className="ml-1 text-xs text-cito-blue">(aanbevolen)</span>
              )}
              {isSelected && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-cito-blue rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeVariant && (
        <div className="p-4">
          <ProposalCard
            variant={activeVariant}
            isSelected={selectedId === activeVariant.id}
            isRecommended={activeVariant.type === recommendedType}
            onSelect={() => onSelect(activeVariant.id)}
            editable={editable}
            onEdit={
              onEditVariant
                ? (text) => onEditVariant(activeVariant.id, text)
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
