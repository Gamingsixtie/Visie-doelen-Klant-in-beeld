"use client";

import { useState, useEffect } from "react";

interface SessionQRCodeProps {
  /** Custom URL to encode (defaults to current page URL) */
  url?: string;
  /** Size of the QR code in pixels */
  size?: number;
  /** Whether to show the URL text */
  showUrl?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for header display */
  compact?: boolean;
}

export function SessionQRCode({
  url,
  size = 150,
  showUrl = true,
  className = "",
  compact = false,
}: SessionQRCodeProps) {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get the network URL (not localhost) for mobile access
    if (typeof window !== "undefined") {
      let baseUrl = url || window.location.href;

      // Add sync parameter for viewer mode
      const urlObj = new URL(baseUrl);
      if (!urlObj.searchParams.has("sync")) {
        urlObj.searchParams.set("sync", "true");
      }
      baseUrl = urlObj.toString();

      setCurrentUrl(baseUrl);
    }
  }, [url]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate QR code URL using QR Server API (free, no API key needed)
  const qrCodeUrl = currentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(currentUrl)}&bgcolor=ffffff&color=1e3a5f`
    : "";

  // Compact version for header
  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="QR-code voor meekijken"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Meekijken</span>
        </button>

        {/* Expanded popup */}
        {isExpanded && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsExpanded(false)}
            />

            {/* Popup */}
            <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[280px] animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Scan om mee te kijken</h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-3">
                {qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code voor sessie"
                    width={150}
                    height={150}
                    className="rounded-lg border border-gray-100"
                  />
                )}
              </div>

              {/* Instructions */}
              <p className="text-sm text-gray-600 text-center mb-3">
                Deelnemers kunnen deze QR-code scannen om de sessie te volgen op hun telefoon.
              </p>

              {/* URL with copy button */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="flex-1 text-xs text-gray-500 truncate font-mono">
                  {currentUrl}
                </div>
                <button
                  onClick={handleCopyUrl}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    copied
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {copied ? "Gekopieerd!" : "Kopieer"}
                </button>
              </div>

              {/* Tip */}
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Tip:</strong> Deelnemers zien dezelfde sessie, maar kunnen alleen meekijken - niet bewerken.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-cito-blue rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Meekijken via telefoon</h3>
          <p className="text-sm text-gray-500">Scan de QR-code om de sessie te volgen</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-4">
        {qrCodeUrl && (
          <div className="p-3 bg-white rounded-xl border-2 border-gray-100 shadow-sm">
            <img
              src={qrCodeUrl}
              alt="QR Code voor sessie"
              width={size}
              height={size}
              className="rounded-lg"
            />
          </div>
        )}
      </div>

      {/* URL display */}
      {showUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 text-sm text-gray-600 truncate font-mono">
              {currentUrl}
            </div>
            <button
              onClick={handleCopyUrl}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-cito-blue text-white hover:bg-blue-800"
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Gekopieerd!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Kopieer link
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-1 text-sm">Hoe werkt het?</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Open de camera-app op je telefoon</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Richt de camera op de QR-code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Tik op de link die verschijnt om de sessie te openen</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default SessionQRCode;
