export function ModeToggle({ mode, setMode }: { mode: "quick" | "deep"; setMode: (mode: "quick" | "deep") => void }) {
  return (
    <div className="inline-flex rounded border border-slate-700 overflow-hidden text-sm">
      <button className={`px-3 py-1 ${mode === "quick" ? "bg-teal-500 text-black" : "bg-slate-800"}`} onClick={() => setMode("quick")}>Quick</button>
      <button className={`px-3 py-1 ${mode === "deep" ? "bg-teal-500 text-black" : "bg-slate-800"}`} onClick={() => setMode("deep")}>Deep</button>
    </div>
  );
}