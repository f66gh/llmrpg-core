const mockEntries = [
  { speaker: "System", text: "Welcome to Starfall City." },
  { speaker: "Guide", text: "Your neural link hums as the tram arrives." }
];

export default function StoryStream() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Story</h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-200">
        {mockEntries.map((entry, idx) => (
          <p key={idx}>
            <span className="text-slate-400">{entry.speaker}:</span>{" "}
            <span>{entry.text}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
