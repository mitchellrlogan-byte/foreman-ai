import { useState, useEffect, useCallback } from "react";
import { auth } from "../lib/api";

interface ApiKeyGateProps {
  children: React.ReactNode;
}

export function ApiKeyGate({ children }: ApiKeyGateProps) {
  const [status, setStatus] = useState<"checking" | "open" | "locked">("checking");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const check = useCallback(async () => {
    // If no key stored, check if server requires one
    if (!auth.getKey()) {
      const protected_ = await auth.isProtected();
      setStatus(protected_ ? "locked" : "open");
    } else {
      setStatus("open");
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  // Listen for UNAUTHORIZED errors from anywhere in the app
  useEffect(() => {
    const handler = () => setStatus("locked");
    window.addEventListener("foreman:unauthorized", handler);
    return () => window.removeEventListener("foreman:unauthorized", handler);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setSaving(true);
    setError("");
    auth.setKey(key.trim());
    // Verify the key works
    const isProtected = await auth.isProtected().catch(() => false);
    if (isProtected) {
      // Key was wrong — still getting 401
      auth.clearKey();
      setError("Invalid API key. Try again.");
      setSaving(false);
    } else {
      setStatus("open");
      setSaving(false);
    }
  }

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-[#080f1a] flex items-center justify-center">
        <div className="text-[#1e4060] text-sm">Connecting...</div>
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="min-h-screen bg-[#080f1a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold text-white"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #14b8a6)" }}
            >
              F
            </div>
            <span className="text-lg font-bold text-[#e0f2fe]">Foreman AI</span>
          </div>

          <div className="bg-[#0d1b2a] border border-[#132030] rounded-xl p-6">
            <h2 className="text-[14px] font-semibold text-[#e0f2fe] mb-1">Enter API Key</h2>
            <p className="text-[11px] text-[#4b6a8a] mb-5">
              This dashboard is protected. Enter your <code className="text-[#38bdf8]">FOREMAN_API_KEY</code> to continue.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="Enter your API key..."
                autoFocus
                className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-lg px-3 py-2.5 text-sm text-[#e0f2fe] placeholder:text-[#1e4060] focus:outline-none focus:border-[#0ea5e9]"
              />
              {error && (
                <p className="text-[11px] text-[#f87171]">{error}</p>
              )}
              <button
                type="submit"
                disabled={saving || !key.trim()}
                className="w-full py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-opacity"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
              >
                {saving ? "Verifying..." : "Unlock Dashboard"}
              </button>
            </form>
          </div>

          <p className="text-center text-[10px] text-[#1e4060] mt-4">
            Set via <code className="text-[#38bdf8]">FOREMAN_API_KEY</code> env var · <a href="https://github.com/mitchellrlogan/foreman-ai" className="hover:text-[#4b6a8a]">docs</a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
