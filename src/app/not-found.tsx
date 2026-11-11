import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <h1>Page not found</h1>
        <p className="muted" style={{ margin: "8px 0 16px" }}>That address does not exist, or the item was deleted.</p>
        <Link href="/" className="btn primary">Back to overview</Link>
      </div>
    </main>
  );
}
