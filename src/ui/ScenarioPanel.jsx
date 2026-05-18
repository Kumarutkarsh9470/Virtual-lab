import React, { useState } from "react";
import { X, Search } from "lucide-react";
import { SCENARIOS } from "../engine/scenarios";

const CATEGORIES = [
  "All",
  "Mechanics",
  "Electrostatics",
  "Magnetism",
  "Kinematics",
];

const CATEGORY_COLORS = {
  Mechanics: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  Electrostatics: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Magnetism: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Kinematics: "bg-green-500/20 text-green-300 border-green-500/30",
};

export default function ScenarioPanel({ onLoad, onClose }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = SCENARIOS.filter((s) => {
    const matchCat = activeCategory === "All" || s.category === activeCategory;
    const matchSearch =
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[760px] max-h-[85vh] bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-semibold text-base">
              Experiment Library
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              +2 level physics scenarios — click any to load
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-2 border-b border-white/8">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white/8 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
            <Search size={13} className="text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenarios..."
              className="bg-transparent text-white/70 text-xs outline-none placeholder-white/25 w-full"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={[
                  "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                  activeCategory === cat
                    ? "bg-indigo-500 text-white border-indigo-400"
                    : "text-white/40 border-white/10 hover:border-white/25 hover:text-white/60",
                ].join(" ")}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3">
          {filtered.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onLoad={() => {
                onLoad(scenario.id);
                onClose();
              }}
            />
          ))}

          {filtered.length === 0 && (
            <div className="col-span-2 py-16 text-center text-white/25 text-sm">
              No scenarios match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, onLoad }) {
  const catStyle =
    CATEGORY_COLORS[scenario.category] ??
    "bg-white/10 text-white/50 border-white/20";

  return (
    <button
      onClick={onLoad}
      className="text-left p-4 rounded-xl bg-white/4 border border-white/8
        hover:bg-white/8 hover:border-indigo-500/40 transition-all group"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{scenario.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/90 font-medium text-sm">
              {scenario.label}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${catStyle}`}
            >
              {scenario.category}
            </span>
          </div>
          <p className="text-white/40 text-xs leading-relaxed line-clamp-2">
            {scenario.description}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-white/6 flex justify-end">
        <span className="text-indigo-400/70 text-[11px] group-hover:text-indigo-300 transition-colors">
          Load scenario →
        </span>
      </div>
    </button>
  );
}
