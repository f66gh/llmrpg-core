const mockActions = ["Look around", "Check inventory", "Talk to passerby"];

export default function ActionPanel() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Actions</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {mockActions.map((action) => (
          <button
            key={action}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
            type="button"
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  );
}
