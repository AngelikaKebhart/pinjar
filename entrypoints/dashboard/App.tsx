/**
 * Dashboard opened in its own browser tab.
 *
 * Scope (see docs/concept.md §3.5): list every saved link across all domains,
 * with search and filters for category, tags and status, plus inline editing.
 * Only the shell exists so far.
 */
function App() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <header>
        <h1 className="text-2xl font-semibold">Universal Wishlist</h1>
        <p className="mt-1 text-sm text-slate-600">
          All your saved links, independent of the shop or website they came from.
        </p>
      </header>

      <main className="mt-8">
        <h2 className="text-lg font-medium">Saved links</h2>
        <p className="mt-2 text-sm text-slate-600">
          Nothing here yet — storage, search and filters are still to be built.
        </p>
      </main>
    </div>
  );
}

export default App;
