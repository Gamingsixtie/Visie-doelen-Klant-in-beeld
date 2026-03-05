"use client";

import { MT_MEMBERS } from "@/lib/types";

interface MemberSelectorProps {
  onSelect: (name: string) => void;
  sessionName?: string;
}

export function MemberSelector({ onSelect, sessionName }: MemberSelectorProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Doelen Feedback
          </h1>
          {sessionName && (
            <p className="text-gray-500">{sessionName}</p>
          )}
          <p className="text-gray-600 mt-4">
            Wie ben je? Kies je naam om feedback te geven.
          </p>
        </div>

        <div className="space-y-3">
          {MT_MEMBERS.map((name) => (
            <button
              key={name}
              onClick={() => onSelect(name)}
              className="w-full px-6 py-4 bg-white border-2 border-gray-200 rounded-xl text-left hover:border-cito-blue hover:bg-cito-light-blue transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cito-blue/10 text-cito-blue font-bold flex items-center justify-center text-lg group-hover:bg-cito-blue group-hover:text-white transition-colors">
                    {name.charAt(0)}
                  </div>
                  <span className="text-lg font-medium text-gray-800">{name}</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-cito-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
