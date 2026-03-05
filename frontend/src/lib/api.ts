const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export async function optimizePortfolio(payload: unknown) {
  const res = await fetch(`${API_URL}/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}