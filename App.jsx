import React, { useMemo, useRef, useState } from "react";

const PERFIS = [
  { nome: "C90 / U93", kgm: 2.43, cor: "#6f7f88" },
  { nome: "C100 / U100", kgm: 2.65, cor: "#60717c" },
  { nome: "C150 / U153", kgm: 3.25, cor: "#566773" },
  { nome: "C200 / U204", kgm: 4.15, cor: "#4d5e69" },
  { nome: "C250 / U255", kgm: 5.05, cor: "#465762" }
];

const C = {
  azul: "#073256",
  azul2: "#0b79b7",
  verde: "#7baa39",
  verde2: "#16a34a",
  fundo: "#eef2f6",
  linha: "#cfd8e3",
  texto: "#10223f",
  suave: "#6b7c93",
  vermelho: "#db2b39",
  laranja: "#f59e0b"
};

function fmt(v, d = 2) {
  return Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
}

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function unit(a, b) {
  const d = dist(a, b) || 1;
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
}

function normal(a, b) {
  const u = unit(a, b);
  return { x: -u.y, y: u.x };
}

function add(p, v, s = 1) {
  return { x: p.x + v.x * s, y: p.y + v.y * s };
}

function pointAt(a, b, d) {
  const u = unit(a, b);
  return { x: a.x + u.x * d, y: a.y + u.y * d };
}

function projection(p, a, b) {
  const u = unit(a, b);
  return (p.x - a.x) * u.x + (p.y - a.y) * u.y;
}

function distToSeg(p, a, b) {
  const len = dist(a, b) || 1;
  const t = clamp(projection(p, a, b) / len, 0, 1);
  return dist(p, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
}

function areaPoly(points) {
  if (points.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

function getBox(points) {
  if (!points.length) return { minX: 0, minY: 0, maxX: 10, maxY: 7, width: 10, height: 7 };
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function wallPoly(a, b, thickness) {
  const n = normal(a, b);
  const h = thickness / 2;
  return [add(a, n, h), add(b, n, h), add(b, n, -h), add(a, n, -h)]
    .map(p => `${p.x},${p.y}`)
    .join(" ");
}

function buildOuter(points, closed) {
  if (!closed || points.length < 3) return [];
  return points.map((p, i) => ({ a: p, b: points[(i + 1) % points.length], tipo: "exterior" }));
}

function downloadFile(name, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function makeDxf(walls) {
  const rows = ["0", "SECTION", "2", "ENTITIES"];
  walls.forEach(w => {
    rows.push(
      "0", "LINE",
      "8", w.tipo === "interior" ? "PAREDES_INTERIORES" : w.tipo === "alpendre" ? "ALPENDRE" : "PAREDES_EXTERIORES",
      "10", String(w.a.x), "20", String(-w.a.y), "30", "0",
      "11", String(w.b.x), "21", String(-w.b.y), "31", "0"
    );
  });
  rows.push("0", "ENDSEC", "0", "EOF");
  return rows.join(String.fromCharCode(10));
}

function iso(x, y, z, cfg) {
  return { x: cfg.ox + x * cfg.ax + y * cfg.bx, y: cfg.oy + x * cfg.ay + y * cfg.by - z * cfg.cz };
}

function Line3D({ a, b, cfg, color, width = 2.5 }) {
  const p = iso(a[0], a[1], a[2], cfg);
  const q = iso(b[0], b[1], b[2], cfg);
  return (
    <g>
      <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#1e293b" strokeWidth={width + 1.2} strokeLinecap="round" />
      <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
    </g>
  );
}

function Guide({ a, b, n, z, cfg, color }) {
  const web = 0.10;
  const a1 = add(a, n, -web / 2);
  const a2 = add(a, n, web / 2);
  const b1 = add(b, n, -web / 2);
  const b2 = add(b, n, web / 2);
  return (
    <g>
      <Line3D a={[a1.x, a1.y, z]} b={[b1.x, b1.y, z]} cfg={cfg} color={color} width={2.8} />
      <Line3D a={[a2.x, a2.y, z]} b={[b2.x, b2.y, z]} cfg={cfg} color={color} width={2.8} />
      <Line3D a={[a1.x, a1.y, z]} b={[a2.x, a2.y, z]} cfg={cfg} color="#94a3b8" width={1.4} />
      <Line3D a={[b1.x, b1.y, z]} b={[b2.x, b2.y, z]} cfg={cfg} color="#94a3b8" width={1.4} />
    </g>
  );
}

function Stud({ c, u, n, h, cfg, color }) {
  const web = 0.09;
  const flange = 0.045;
  const p1 = add(c, n, -web / 2);
  const p2 = add(c, n, web / 2);
  const f1 = add(p1, u, flange);
  const f2 = add(p2, u, flange);
  return (
    <g>
      <Line3D a={[p1.x, p1.y, 0]} b={[p1.x, p1.y, h]} cfg={cfg} color={color} width={2.1} />
      <Line3D a={[p2.x, p2.y, 0]} b={[p2.x, p2.y, h]} cfg={cfg} color={color} width={2.1} />
      <Line3D a={[f1.x, f1.y, 0]} b={[f1.x, f1.y, h]} cfg={cfg} color={color} width={1.6} />
      <Line3D a={[f2.x, f2.y, 0]} b={[f2.x, f2.y, h]} cfg={cfg} color={color} width={1.6} />
      <Line3D a={[p1.x, p1.y, 0]} b={[p2.x, p2.y, 0]} cfg={cfg} color="#94a3b8" width={1.1} />
      <Line3D a={[p1.x, p1.y, h]} b={[p2.x, p2.y, h]} cfg={cfg} color="#94a3b8" width={1.1} />
    </g>
  );
}

function openingOnWall(opening, wall) {
  const mid = { x: (opening.a.x + opening.b.x) / 2, y: (opening.a.y + opening.b.y) / 2 };
  if (distToSeg(mid, wall.a, wall.b) > 1.1) return null;
  const len = dist(wall.a, wall.b);
  let t0 = projection(opening.a, wall.a, wall.b);
  let t1 = projection(opening.b, wall.a, wall.b);
  if (t1 < t0) [t0, t1] = [t1, t0];
  t0 = clamp(t0, 0, len);
  t1 = clamp(t1, 0, len);
  if (t1 - t0 < 0.20) return null;
  return { ...opening, t0, t1 };
}

function StructureView({ walls, openings, params, boxM, mode }) {
  const profile = PERFIS.find(p => p.nome === params.perfil) || PERFIS[1];
  const h = Number(params.alturaParede) || 2.7;
  const rise = Number(params.elevacaoCobertura) || 1.1;
  const spacing = (Number(params.espacamento) || 600) / 1000;
  const boxW = Math.max(4, boxM.width);
  const boxH = Math.max(4, boxM.height);
  const scale = Math.min(650 / (boxW + boxH + 4), 320 / (h + rise + 1.5));
  const cfg = mode === "3d"
    ? { ox: 470, oy: 470, ax: scale, ay: scale * 0.25, bx: 0, by: scale * 0.95, cz: scale * 1.08 }
    : { ox: 520, oy: 480, ax: scale * 0.92, ay: scale * 0.42, bx: -scale * 0.92, by: scale * 0.42, cz: scale * 1.08 };

  const items = [];

  walls.forEach((wall, wi) => {
    const len = dist(wall.a, wall.b);
    if (len < 0.01) return;
    const u = unit(wall.a, wall.b);
    const n = normal(wall.a, wall.b);
    const color = wall.tipo === "interior" ? C.verde2 : wall.tipo === "alpendre" ? C.verde : profile.cor;
    const ops = openings.map(op => openingOnWall(op, wall)).filter(Boolean);

    const inOpening = d => ops.some(op => d > op.t0 + 0.03 && d < op.t1 - 0.03);

    items.push(<Guide key={`gb-${wi}`} a={wall.a} b={wall.b} n={n} z={0} cfg={cfg} color={color} />);
    items.push(<Guide key={`gt-${wi}`} a={wall.a} b={wall.b} n={n} z={h} cfg={cfg} color={color} />);

    const count = Math.max(2, Math.floor(len / spacing) + 1);
    for (let i = 0; i <= count; i += 1) {
      const d = clamp(i * spacing, 0, len);
      if (inOpening(d)) continue;
      const c = pointAt(wall.a, wall.b, d);
      items.push(<Stud key={`stud-${wi}-${i}`} c={c} u={u} n={n} h={h} cfg={cfg} color={color} />);
    }

    ops.forEach((op, oi) => {
      const p0 = pointAt(wall.a, wall.b, op.t0);
      const p1 = pointAt(wall.a, wall.b, op.t1);
      const head = 2.1;
      const sill = op.tipo === "janela" ? 0.95 : 0;
      const opColor = op.tipo === "janela" ? C.laranja : C.verde2;
      items.push(<Stud key={`op-a-${wi}-${oi}`} c={p0} u={u} n={n} h={head} cfg={cfg} color={opColor} />);
      items.push(<Stud key={`op-b-${wi}-${oi}`} c={p1} u={u} n={n} h={head} cfg={cfg} color={opColor} />);
      items.push(<Guide key={`op-head-${wi}-${oi}`} a={p0} b={p1} n={n} z={head} cfg={cfg} color={opColor} />);
      if (op.tipo === "janela") {
        items.push(<Guide key={`op-sill-${wi}-${oi}`} a={p0} b={p1} n={n} z={sill} cfg={cfg} color={opColor} />);
      }
    });
  });

  if (walls.length >= 2) {
    const minX = boxM.minX;
    const maxX = boxM.maxX;
    const minY = boxM.minY;
    const maxY = boxM.maxY;
    const midX = (minX + maxX) / 2;
    const step = Math.max(1.2, (maxY - minY) / 5);
    let k = 0;
    for (let y = minY; y <= maxY + 0.01; y += step) {
      items.push(<Line3D key={`rl-${k}`} a={[minX, y, h]} b={[midX, y, h + rise]} cfg={cfg} color={C.azul} width={2.2} />);
      items.push(<Line3D key={`rr-${k}`} a={[midX, y, h + rise]} b={[maxX, y, h]} cfg={cfg} color={C.azul} width={2.2} />);
      items.push(<Line3D key={`rb-${k}`} a={[minX, y, h]} b={[maxX, y, h]} cfg={cfg} color="#94a3b8" width={1.3} />);
      k += 1;
    }
    items.push(<Line3D key="ridge" a={[midX, minY, h + rise]} b={[midX, maxY, h + rise]} cfg={cfg} color={C.azul2} width={3.5} />);
  }

  return <svg viewBox="0 0 1000 700" className="model-canvas">{items}</svg>;
}

function Field({ label, value, onChange, type = "text" }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} /></label>;
}

function SummaryRow({ label, value }) {
  return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>;
}

function TabButton({ active, children, onClick }) {
  return <button className={active ? "tab active" : "tab"} onClick={onClick}>{children}</button>;
}

function SmallButton({ active, children, onClick }) {
  return <button className={active ? "small-btn active" : "small-btn"} onClick={onClick}>{children}</button>;
}

function Plan2D({ walls, openings, porches, base, wallPx, mPerPx }) {
  return (
    <svg viewBox="0 0 900 620" className="editor-canvas">
      <defs><pattern id="grid-plan" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" fill="none" stroke="#e4eaf1" strokeWidth="1" /></pattern></defs>
      <rect width="900" height="620" fill="url(#grid-plan)" />
      {base && <image href={base} x="50" y="30" width="800" height="560" preserveAspectRatio="xMidYMid meet" opacity="0.18" />}
      {walls.map((w, i) => <polygon key={i} points={wallPoly(w.a, w.b, wallPx)} fill={w.tipo === "interior" ? "#dce7d0" : w.tipo === "alpendre" ? "#e7f2db" : "#d9e5ef"} stroke={w.tipo === "interior" ? C.verde : C.azul} strokeWidth="2" />)}
      {openings.map((o, i) => <line key={i} x1={o.a.x} y1={o.a.y} x2={o.b.x} y2={o.b.y} stroke={o.tipo === "janela" ? C.laranja : C.verde2} strokeWidth="9" strokeDasharray={o.tipo === "janela" ? "8 6" : ""} />)}
      {porches.map((p, i) => <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill="rgba(123,170,57,0.14)" stroke={C.verde} strokeWidth="3" />)}
      {walls.map((w, i) => <text key={`t-${i}`} x={(w.a.x + w.b.x) / 2} y={(w.a.y + w.b.y) / 2 - 6} fontSize="14" fontWeight="900" fill={C.texto}>{fmt(dist(w.a, w.b) * mPerPx)} m</text>)}
    </svg>
  );
}

function SteelMap({ walls, params }) {
  const profile = PERFIS.find(p => p.nome === params.perfil) || PERFIS[1];
  const h = Number(params.alturaParede) || 2.7;
  const spacing = (Number(params.espacamento) || 600) / 1000;
  return (
    <div className="map-card">
      <h3>Mapa técnico de aço</h3>
      <table>
        <thead><tr><th>#</th><th>Tipo</th><th>Comprimento</th><th>Perfil</th><th>Kg</th></tr></thead>
        <tbody>
          {walls.map((w, i) => {
            const len = dist(w.a, w.b);
            const kg = (Math.max(2, Math.floor(len / spacing) + 1) * h + 2 * len) * profile.kgm;
            return <tr key={i}><td>{i + 1}</td><td>{w.tipo}</td><td>{fmt(len)} m</td><td>{params.perfil}</td><td>{fmt(kg)} kg</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const svgRef = useRef(null);
  const [tab, setTab] = useState("editor");
  const [mode, setMode] = useState("perimetro");
  const [dados, setDados] = useState({ projeto: "Projeto LSF Versão 5.8", cliente: "Fernando Pereira", local: "Portugal" });
  const [params, setParams] = useState({ alturaParede: 2.7, elevacaoCobertura: 1.1, espacamento: 600, espessuraParede: 150, precoKg: 3.6, perfil: "C100 / U100", larguraRealM: 10 });
  const [points, setPoints] = useState([]);
  const [closed, setClosed] = useState(false);
  const [innerWalls, setInnerWalls] = useState([]);
  const [openings, setOpenings] = useState([]);
  const [porches, setPorches] = useState([]);
  const [draft, setDraft] = useState(null);
  const [openingType, setOpeningType] = useState("porta");
  const [base, setBase] = useState(null);
  const [fileName, setFileName] = useState("");

  const outerWalls = useMemo(() => buildOuter(points, closed), [points, closed]);

  const porchWallsPx = useMemo(() => {
    const out = [];
    porches.forEach(p => {
      const p1 = { x: p.x, y: p.y };
      const p2 = { x: p.x + p.w, y: p.y };
      const p3 = { x: p.x + p.w, y: p.y + p.h };
      const p4 = { x: p.x, y: p.y + p.h };
      out.push({ a: p1, b: p2, tipo: "alpendre" }, { a: p2, b: p3, tipo: "alpendre" }, { a: p3, b: p4, tipo: "alpendre" }, { a: p4, b: p1, tipo: "alpendre" });
    });
    return out;
  }, [porches]);

  const wallsPx = useMemo(() => [...outerWalls, ...innerWalls.map(w => ({ ...w, tipo: "interior" })), ...porchWallsPx], [outerWalls, innerWalls, porchWallsPx]);

  const allPoints = useMemo(() => {
    const arr = [...points];
    innerWalls.forEach(w => arr.push(w.a, w.b));
    openings.forEach(o => arr.push(o.a, o.b));
    porches.forEach(p => arr.push({ x: p.x, y: p.y }, { x: p.x + p.w, y: p.y + p.h }));
    return arr;
  }, [points, innerWalls, openings, porches]);

  const boxPx = useMemo(() => getBox(allPoints.length ? allPoints : [{ x: 100, y: 100 }, { x: 500, y: 350 }]), [allPoints]);
  const mPerPx = Number(params.larguraRealM || 10) / Math.max(1, boxPx.width);
  const toM = p => ({ x: (p.x - boxPx.minX) * mPerPx, y: (p.y - boxPx.minY) * mPerPx });
  const wallsM = useMemo(() => wallsPx.map(w => ({ ...w, a: toM(w.a), b: toM(w.b) })), [wallsPx, boxPx, mPerPx]);
  const openingsM = useMemo(() => openings.map(o => ({ ...o, a: toM(o.a), b: toM(o.b) })), [openings, boxPx, mPerPx]);
  const boxM = useMemo(() => getBox(wallsM.flatMap(w => [w.a, w.b])), [wallsM]);

  const summary = useMemo(() => {
    const profile = PERFIS.find(p => p.nome === params.perfil) || PERFIS[1];
    const h = Number(params.alturaParede) || 2.7;
    const spacing = (Number(params.espacamento) || 600) / 1000;
    let kg = 0;
    let totalLength = 0;
    wallsM.forEach(w => {
      const len = dist(w.a, w.b);
      totalLength += len;
      kg += (Math.max(2, Math.floor(len / spacing) + 1) * h + 2 * len) * profile.kgm;
    });
    return { area: areaPoly(points) * mPerPx * mPerPx, totalLength, kg, cost: kg * Number(params.precoKg || 0) };
  }, [wallsM, points, mPerPx, params]);

  function svgPos(evt) {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((evt.clientX - rect.left) / rect.width) * 900, y: ((evt.clientY - rect.top) / rect.height) * 620 };
  }

  function editorClick(evt) {
    const p = svgPos(evt);
    if (mode === "perimetro") {
      if (!closed) setPoints(v => [...v, p]);
      return;
    }
    if (!draft) {
      setDraft(p);
      return;
    }
    if (mode === "interior") setInnerWalls(v => [...v, { a: draft, b: p }]);
    if (mode === "abertura") setOpenings(v => [...v, { a: draft, b: p, tipo: openingType }]);
    if (mode === "alpendre") {
      const x = Math.min(draft.x, p.x);
      const y = Math.min(draft.y, p.y);
      setPorches(v => [...v, { x, y, w: Math.abs(p.x - draft.x), h: Math.abs(p.y - draft.y) }]);
    }
    setDraft(null);
  }

  function undo() {
    if (draft) return setDraft(null);
    if (mode === "perimetro") return closed ? setClosed(false) : setPoints(v => v.slice(0, -1));
    if (mode === "interior") return setInnerWalls(v => v.slice(0, -1));
    if (mode === "abertura") return setOpenings(v => v.slice(0, -1));
    if (mode === "alpendre") return setPorches(v => v.slice(0, -1));
  }

  function clearAll() {
    setPoints([]);
    setClosed(false);
    setInnerWalls([]);
    setOpenings([]);
    setPorches([]);
    setDraft(null);
  }

  function upload(evt) {
    const file = evt.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.type.startsWith("image/")) setBase(URL.createObjectURL(file));
  }

  function exportTxt() {
    const lines = [
      "MEMÓRIA LSF V5.8",
      `Projeto: ${dados.projeto}`,
      `Cliente: ${dados.cliente}`,
      `Local: ${dados.local}`,
      `Área: ${fmt(summary.area)} m2`,
      `Paredes: ${fmt(summary.totalLength)} m`,
      `Aço: ${fmt(summary.kg)} kg`,
      `Custo: ${fmt(summary.cost)} €`
    ];
    downloadFile("memoria_lsf_v58.txt", lines.join(String.fromCharCode(10)));
  }

  function exportDxf() {
    downloadFile("planta_lsf_v58.dxf", makeDxf(wallsM), "application/dxf");
  }

  return (
    <div className="page">
      <div className="layout">
        <aside className="sidebar">
          <section className="panel">
            <h2>1. Dados</h2>
            <Field label="Projeto" value={dados.projeto} onChange={v => setDados(s => ({ ...s, projeto: v }))} />
            <Field label="Cliente" value={dados.cliente} onChange={v => setDados(s => ({ ...s, cliente: v }))} />
            <Field label="Local" value={dados.local} onChange={v => setDados(s => ({ ...s, local: v }))} />
          </section>

          <section className="panel">
            <h2>2. Parâmetros LSF</h2>
            <div className="grid2">
              <Field label="Altura m" type="number" value={params.alturaParede} onChange={v => setParams(s => ({ ...s, alturaParede: Number(v) }))} />
              <Field label="Cobertura m" type="number" value={params.elevacaoCobertura} onChange={v => setParams(s => ({ ...s, elevacaoCobertura: Number(v) }))} />
              <Field label="Espaçamento mm" type="number" value={params.espacamento} onChange={v => setParams(s => ({ ...s, espacamento: Number(v) }))} />
              <Field label="Parede mm" type="number" value={params.espessuraParede} onChange={v => setParams(s => ({ ...s, espessuraParede: Number(v) }))} />
              <Field label="€/kg" type="number" value={params.precoKg} onChange={v => setParams(s => ({ ...s, precoKg: Number(v) }))} />
              <Field label="Largura real m" type="number" value={params.larguraRealM} onChange={v => setParams(s => ({ ...s, larguraRealM: Number(v) }))} />
            </div>
            <label className="field">
              <span>Perfil</span>
              <select value={params.perfil} onChange={e => setParams(s => ({ ...s, perfil: e.target.value }))}>
                {PERFIS.map(p => <option key={p.nome}>{p.nome}</option>)}
              </select>
            </label>
          </section>

          <section className="panel">
            <h2>3. Planta base</h2>
            <label className="upload">Carregar imagem/PDF<input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={upload} /></label>
            <p className="hint">{fileName || "Nenhum ficheiro selecionado."}</p>
          </section>

          <section className="panel">
            <h2>4. Resumo</h2>
            <SummaryRow label="Área" value={`${fmt(summary.area)} m²`} />
            <SummaryRow label="Paredes" value={`${fmt(summary.totalLength)} m`} />
            <SummaryRow label="Aço" value={`${fmt(summary.kg)} kg`} />
            <SummaryRow label="Custo" value={`${fmt(summary.cost)} €`} />
            <div className="actions">
              <button className="primary outline" onClick={exportTxt}>Gerar memória TXT</button>
              <button className="primary" onClick={exportDxf}>Exportar DXF</button>
              <button className="primary green" onClick={() => window.print()}>Imprimir / PDF</button>
            </div>
          </section>
        </aside>

        <main className="workspace">
          <p className="overline">MODELO LSF V5.8</p>
          <h1>{dados.projeto}</h1>
          <p className="subtitle">{dados.cliente} · {dados.local} · {params.perfil}</p>

          <div className="tabs">
            <TabButton active={tab === "editor"} onClick={() => setTab("editor")}>Editor</TabButton>
            <TabButton active={tab === "planta"} onClick={() => setTab("planta")}>Planta 2D</TabButton>
            <TabButton active={tab === "iso"} onClick={() => setTab("iso")}>Isométrico</TabButton>
            <TabButton active={tab === "3d"} onClick={() => setTab("3d")}>3D</TabButton>
            <TabButton active={tab === "mapa"} onClick={() => setTab("mapa")}>Mapa</TabButton>
          </div>

          {tab === "editor" && (
            <>
              <div className="toolbar">
                <SmallButton active={mode === "perimetro"} onClick={() => setMode("perimetro")}>Perímetro</SmallButton>
                <SmallButton active={mode === "interior"} onClick={() => setMode("interior")}>Parede interior</SmallButton>
                <SmallButton active={mode === "abertura"} onClick={() => setMode("abertura")}>Abertura</SmallButton>
                <SmallButton active={mode === "alpendre"} onClick={() => setMode("alpendre")}>Alpendre</SmallButton>
                <SmallButton onClick={() => setClosed(true)}>Fechar</SmallButton>
                <SmallButton onClick={undo}>Desfazer</SmallButton>
                <SmallButton onClick={clearAll}>Limpar</SmallButton>
                <select value={openingType} onChange={e => setOpeningType(e.target.value)}>
                  <option value="porta">Porta</option>
                  <option value="janela">Janela</option>
                </select>
              </div>

              <svg ref={svgRef} onClick={editorClick} viewBox="0 0 900 620" className="editor-canvas">
                <defs>
                  <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#e4eaf1" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="900" height="620" fill="url(#grid)" />
                {base && <image href={base} x="50" y="30" width="800" height="560" preserveAspectRatio="xMidYMid meet" opacity="0.55" />}
                {closed && points.length >= 3
                  ? <polygon points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="rgba(11,121,183,0.08)" stroke={C.azul2} strokeWidth="3" />
                  : <polyline points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={C.azul2} strokeWidth="3" />}
                {innerWalls.map((w, i) => <line key={i} x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} stroke={C.verde} strokeWidth="4" strokeLinecap="round" />)}
                {openings.map((o, i) => <line key={i} x1={o.a.x} y1={o.a.y} x2={o.b.x} y2={o.b.y} stroke={o.tipo === "janela" ? C.laranja : C.verde2} strokeWidth="7" strokeDasharray={o.tipo === "janela" ? "8 6" : ""} />)}
                {porches.map((p, i) => <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill="rgba(123,170,57,0.15)" stroke={C.verde} strokeWidth="3" />)}
                {draft && <circle cx={draft.x} cy={draft.y} r="7" fill={C.vermelho} />}
                {points.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={i === 0 ? 8 : 6} fill={i === 0 ? C.laranja : C.azul} /><text x={p.x + 10} y={p.y - 10} fontSize="16" fontWeight="900" fill={C.texto}>P{i + 1}</text></g>)}
              </svg>
            </>
          )}

          {tab === "planta" && (
            <Plan2D
              walls={wallsPx}
              openings={openings}
              porches={porches}
              base={base}
              wallPx={Math.max(10, Number(params.espessuraParede || 150) / 12)}
              mPerPx={mPerPx}
            />
          )}
          {tab === "iso" && <StructureView walls={wallsM} openings={openingsM} params={params} boxM={boxM} mode="iso" />}
          {tab === "3d" && <StructureView walls={wallsM} openings={openingsM} params={params} boxM={boxM} mode="3d" />}
          {tab === "mapa" && <SteelMap walls={wallsM} params={params} />}

          <div className="notice">
            V5.8: portas, janelas, vergas, peitoris, alpendres independentes, perfis C/U visíveis e sem casca/perímetro nas vistas ISO/3D.
          </div>
        </main>
      </div>
    </div>
  );
}
