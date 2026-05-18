import React from 'react';
import {
  MousePointer2,
  Square,
  Circle,
  Hexagon,
  Minus,
  Link,
  Zap,
  Anchor,
  Settings,
  Hand,
  Trash2,
  RotateCcw,
  Triangle,
  AlignLeft,
  BookOpen,
} from 'lucide-react';

const TOOL_GROUPS = [
  {
    label: 'Navigate',
    tools: [
      { id: 'select', icon: MousePointer2, tip: 'Select & inspect' },
      { id: 'pan', icon: Hand, tip: 'Pan canvas (or middle-click drag)' },
    ],
  },
  {
    label: 'Bodies',
    tools: [
      { id: 'box', icon: Square, tip: 'Add box' },
      { id: 'circle', icon: Circle, tip: 'Add circle' },
      { id: 'polygon', icon: Hexagon, tip: 'Add polygon' },
      { id: 'static', icon: Minus, tip: 'Add static wall/platform' },
      { id: 'wedge', icon: Triangle, tip: 'Add wedge (inclined surface)' },
      { id: 'incline', icon: AlignLeft, tip: 'Add inclined plane (static)' },
    ],
  },
  {
    label: 'Constraints',
    tools: [
      { id: 'rope', icon: Link, tip: 'Rope - click two bodies' },
      { id: 'spring', icon: Zap, tip: 'Spring - click two bodies' },
      { id: 'pivot', icon: Anchor, tip: 'Pivot - click a body' },
      { id: 'motor', icon: Settings, tip: 'Motor - click a body' },
    ],
  },
];

export default function Toolbar({
  activeTool,
  onToolChange,
  onDeleteSelected,
  onClearAll,
  onOpenScenarios,
  hasSelection,
}) {
  return (
    <div className="flex flex-col gap-1 p-2 bg-[#1e2130] border-r border-white/10 select-none w-14">
      <ToolButton
        icon={BookOpen}
        tip="Experiment Library"
        onClick={onOpenScenarios}
        accent
      />
      <div className="h-px bg-white/10 my-1" />

      {TOOL_GROUPS.map((group, gi) => (
        <React.Fragment key={group.label}>
          {gi > 0 && <div className="h-px bg-white/10 my-1" />}
          <span className="text-[9px] text-white/30 uppercase tracking-widest px-1 pb-0.5">
            {group.label}
          </span>
          {group.tools.map(({ id, icon: Icon, tip }) => (
            <ToolButton
              key={id}
              icon={Icon}
              tip={tip}
              active={activeTool === id}
              onClick={() => onToolChange(id)}
            />
          ))}
        </React.Fragment>
      ))}

      <div className="flex-1" />
      <div className="h-px bg-white/10 my-1" />
      <ToolButton icon={Trash2} tip="Delete selected (Del)" onClick={onDeleteSelected} disabled={!hasSelection} danger />
      <ToolButton icon={RotateCcw} tip="Clear all bodies" onClick={onClearAll} danger />
    </div>
  );
}

function ToolButton({ icon: Icon, tip, active, onClick, disabled, danger, accent }) {
  return (
    <button
      title={tip}
      disabled={disabled}
      onClick={onClick}
      className={[
        'relative group flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150',
        active
          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
          : accent
            ? 'text-amber-400/80 hover:bg-amber-500/15 hover:text-amber-300'
            : danger
              ? 'text-red-400/60 hover:bg-red-500/15 hover:text-red-400'
              : 'text-white/50 hover:bg-white/8 hover:text-white/90',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <Icon size={17} strokeWidth={1.75} />
      <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded bg-[#2a2d3e] px-2 py-1 text-xs text-white/80 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {tip}
      </span>
    </button>
  );
}
