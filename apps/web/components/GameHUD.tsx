type GameHUDProps = {
  hp?: number;
  mp?: number;
  credits?: number;
};

export default function GameHUD({
  hp = 100,
  mp = 50,
  credits = 0
}: GameHUDProps) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Status</h2>
      <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-slate-200">
        <div>
          <div className="text-slate-400">HP</div>
          <div className="text-xl font-bold text-emerald-400">{hp}</div>
        </div>
        <div>
          <div className="text-slate-400">MP</div>
          <div className="text-xl font-bold text-sky-400">{mp}</div>
        </div>
        <div>
          <div className="text-slate-400">Credits</div>
          <div className="text-xl font-bold text-amber-300">{credits}</div>
        </div>
      </div>
    </section>
  );
}
