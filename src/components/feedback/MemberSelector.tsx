"use client";

import { MT_MEMBERS, FACILITATOR_NAME } from "@/lib/types";

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
          {/* Facilitator button - separate from MT members */}
          <button
            onClick={() => onSelect(FACILITATOR_NAME)}
            className="w-full px-6 py-4 bg-gradient-to-r from-cito-blue/5 to-blue-50 border-2 border-cito-blue/30 rounded-xl text-left hover:border-cito-blue hover:from-cito-blue/10 hover:to-blue-100 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cito-blue text-white font-bold flex items-center justify-center text-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-lg font-medium text-gray-800">Facilitator</span>
                  <p className="text-xs text-gray-500">Beheer de feedbackronde</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-gray-50 px-3 text-xs text-gray-400 uppercase">MT-leden</span></div>
          </div>

          {/* MT member buttons */}
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
