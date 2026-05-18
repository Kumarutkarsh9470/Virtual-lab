import React, { useState, useEffect } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { updateBodyMaterial, updateBodyColor } from "../engine/bodies";

const PRESET_COLORS = [
  "#4f8ef7",
  "#f75f4f",
  "#4ff7a0",
  "#f7c44f",
  "#c44ff7",
  "#f74fc4",
  "#4fc4f7",
  "#f7f74f",
];

export default function PropertyPanel({ body, onClose, onDelete }) {
  const [mass, setMass] = useState(1);
  const [friction, setFriction] = useState(0.3);
  const [restitution, setRestitution] = useState(0.5);
  const [frictionAir, setFrictionAir] = useState(0.01);
  const [color, setColor] = useState("#4f8ef7");
  const [charge, setCharge] = useState(0);
  const [magneticStrength, setMagneticStrength] = useState(0);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!body) return;
    setMass(+(body.mass ?? 1).toFixed(3));
    setFriction(+(body.friction ?? 0.3).toFixed(3));
    setRestitution(+(body.restitution ?? 0.5).toFixed(3));
    setFrictionAir(+(body.frictionAir ?? 0.01).toFixed(4));
    setColor(body.bodyColor ?? "#4f8ef7");
    setCharge(+(body.charge ?? 0).toFixed(2));
    setMagneticStrength(+(body.magneticStrength ?? 0).toFixed(2));
  }, [body]);

  if (!body) return null;

  const apply = (field, value) => {
    const n = parseFloat(value);
    if (isNaN(n)) return;
    updateBodyMaterial(body.gameId, { [field]: n });
    if (field === "mass") setMass(n);
    if (field === "friction") setFriction(n);
    if (field === "restitution") setRestitution(n);
    if (field === "frictionAir") setFrictionAir(n);
  };

  const applyCharge = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return;
    body.charge = n;
    setCharge(n);
  };

  const applyMagnetic = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return;
    body.magneticStrength = n;
    setMagneticStrength(n);
  };

  const applyColor = (c) => {
    setColor(c);
    updateBodyColor(body.gameId, c);
  };

  return (
    <div className="w-60 bg-[#1e2130] border-l border-white/10 flex flex-col text-sm text-white/80 select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-white/90 font-medium hover:text-white transition-colors"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Properties
        </button>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/30 bg-white/8 px-1.5 py-0.5 rounded capitalize">
            {body.bodyType ?? "body"}
          </span>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="px-3 py-2 flex flex-col gap-3">
          {/* Color */}
          <Section label="Color">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => applyColor(c)}
                  title={c}
                  className={[
                    "w-6 h-6 rounded transition-all",
                    color === c
                      ? "ring-2 ring-white ring-offset-1 ring-offset-[#1e2130] scale-110"
                      : "hover:scale-110",
                  ].join(" ")}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => applyColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                title="Custom color"
              />
            </div>
          </Section>

          {/* Mass */}
          <Section label="Mass (kg)">
            <SliderInput
              value={mass}
              min={0.01}
              max={100}
              step={0.01}
              onChange={(v) => apply("mass", v)}
              disabled={body.isStatic}
            />
          </Section>

          {/* Friction */}
          <Section label="Friction">
            <SliderInput
              value={friction}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => apply("friction", v)}
            />
          </Section>

          {/* Restitution (bounciness) */}
          <Section label="Bounciness">
            <SliderInput
              value={restitution}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => apply("restitution", v)}
            />
          </Section>

          {/* Air friction */}
          <Section label="Air Resistance">
            <SliderInput
              value={frictionAir}
              min={0}
              max={0.5}
              step={0.001}
              onChange={(v) => apply("frictionAir", v)}
              disabled={body.isStatic}
            />
          </Section>

          {/* Charge */}
          <Section label="Charge (μC)">
            <SliderInput
              value={charge}
              min={-5}
              max={5}
              step={0.1}
              onChange={applyCharge}
            />
            <div
              className="text-[10px] mt-0.5"
              style={{
                color: charge > 0 ? "#f55" : charge < 0 ? "#5af" : "#666",
              }}
            >
              {charge > 0
                ? `+${charge.toFixed(1)} μC (positive)`
                : charge < 0
                  ? `${charge.toFixed(1)} μC (negative)`
                  : "neutral"}
            </div>
          </Section>

          {/* Magnetic strength */}
          <Section label="Magnetic Strength">
            <SliderInput
              value={magneticStrength}
              min={-5}
              max={5}
              step={0.1}
              onChange={applyMagnetic}
            />
            <div className="text-[10px] mt-0.5 text-white/30">
              {magneticStrength !== 0
                ? `N pole: ${body.angle != null ? (((body.angle * 180) / Math.PI) % 360).toFixed(0) : 0}° direction`
                : "non-magnetic"}
            </div>
          </Section>

          {/* Read-only physics info */}
          <Section label="Live State">
            <LiveState body={body} />
          </Section>

          {/* Delete */}
          <button
            onClick={() => onDelete(body.gameId)}
            className="mt-1 w-full py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors text-xs font-medium"
          >
            Delete Body
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function SliderInput({ value, min, max, step, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-1 accent-indigo-500 disabled:opacity-30"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 bg-white/8 rounded px-1.5 py-0.5 text-xs text-right text-white/80 border border-white/10 focus:border-indigo-400 outline-none disabled:opacity-30"
      />
    </div>
  );
}

function LiveState({ body }) {
  const [tick, setTick] = useState(0);
  // Re-render ~10fps to show live values
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  if (!body) return null;

  const vx = body.velocity?.x ?? 0;
  const vy = body.velocity?.y ?? 0;
  const speed = Math.sqrt(vx * vx + vy * vy).toFixed(2);
  const ke = (0.5 * (body.mass ?? 1) * (vx * vx + vy * vy)).toFixed(2);
  const angle = (((body.angle ?? 0) * 180) / Math.PI).toFixed(1);

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
      <Row label="Speed" value={`${speed} u/s`} />
      <Row label="KE" value={`${ke} J`} />
      <Row label="Angle" value={`${angle}°`} />
      <Row label="x" value={(body.position?.x ?? 0).toFixed(1)} />
      <Row label="y" value={(body.position?.y ?? 0).toFixed(1)} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <>
      <span className="text-white/30">{label}</span>
      <span className="text-white/70 text-right font-mono">{value}</span>
    </>
  );
}
