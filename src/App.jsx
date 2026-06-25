import { useState, useMemo, useEffect } from "react";

const CSV_URL = "/api/prices";

const TAXAS = { Normal: 0, Classico: 0.14, Premium: 0.19 };
const IMPOSTO_RATE = 0.10;

const CHANNELS = [
  { key: "sc",            label: "Smart Can",           colorD: "#ff6b35", colorL: "#d44f1a", bgD: "#1a0f0a", bgL: "#fff3ee" },
  { key: "ml",            label: "ML s/ Frete",         colorD: "#ffe600", colorL: "#b8a000", bgD: "#1a1800", bgL: "#fffde6" },
  { key: "ml_frete",      label: "ML Frete Grátis",     colorD: "#ffd000", colorL: "#a07800", bgD: "#1a1500", bgL: "#fff8e0" },
  { key: "amazon",        label: "Amazon",               colorD: "#ff9900", colorL: "#b86a00", bgD: "#1a1000", bgL: "#fff4e0" },
  { key: "amazon_frete",  label: "Amazon Frete Grátis", colorD: "#ffb347", colorL: "#a06020", bgD: "#1a1200", bgL: "#fff6e8" },
  { key: "shopee",        label: "Shopee",               colorD: "#ff4d00", colorL: "#c03000", bgD: "#1a0800", bgL: "#fff0eb" },
  { key: "shopee_frete",  label: "Shopee Frete Grátis", colorD: "#ff6633", colorL: "#b84020", bgD: "#1a0a00", bgL: "#fff2ed" },
];

function parseCSV(text) {
  const allLines = text.trim().split("\n");
  const headerIdx = allLines.findIndex(l => l.includes("SKU"));
  if (headerIdx === -1) return [];
  const lines = allLines.slice(headerIdx);
  if (lines.length < 2) return [];

  const parseR = (v) => {
    if (!v) return null;
    const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? null : n;
  };

  return lines.slice(1).map(line => {
    const cols = [];
    let cur = "", inQ = false;
    for (let c of line) {
      if (c === '"') { inQ = !inQ; }
      else if (c === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    cols.push(cur.trim());

    const sku = cols[0]?.replace(/"/g, "").trim();
    if (!sku) return null;

    return {
      sku,
      nome:  cols[1]?.replace(/"/g, "").trim() || sku,
      custo: parseR(cols[2]),
      precos: {
        sc:           parseR(cols[6]),
        ml:           parseR(cols[8]),
        ml_frete:     parseR(cols[9]),
        amazon:       parseR(cols[10]),
        amazon_frete: parseR(cols[11]),
        shopee:       parseR(cols[12]),
        shopee_frete: parseR(cols[13]),
      }
    };
  }).filter(Boolean);
}

function calcLucro(venda, custo, tipoML, frete) {
  if (!venda || venda <= 0 || !custo) return null;
  const impostos = venda * IMPOSTO_RATE;
  const taxa     = venda * (TAXAS[tipoML] || 0);
  const lucroR   = venda - custo - impostos - taxa - (frete || 0);
  const lucroP   = (lucroR / venda) * 100;
  return { lucroR, lucroP, impostos, taxa };
}

function LucroTag({ lucroR, lucroP }) {
  if (lucroR === null || lucroR === undefined) return <span style={{ color: "#aaa" }}>—</span>;
  const color = lucroR > 0 ? "#16a34a" : lucroR === 0 ? "#ca8a04" : "#dc2626";
  return (
    <span style={{ color, fontWeight: 700, fontSize: 13 }}>
      {lucroR > 0 ? "+" : ""}R$ {lucroR.toFixed(2)} ({lucroP.toFixed(1)}%)
    </span>
  );
}

function ChannelRow({ ch, custo, values, onChange, dark }) {
  const color  = dark ? ch.colorD : ch.colorL;
  const bg     = dark ? ch.bgD    : ch.bgL;
  const border = dark ? `1px solid ${ch.colorD}22` : `1px solid ${ch.colorL}33`;
  const inputBg   = dark ? "#111" : "#fff";
  const inputBorder = dark ? `1px solid ${ch.colorD}44` : `1px solid ${ch.colorL}66`;
  const inputColor  = dark ? "#fff" : "#111";
  const subColor    = dark ? "#555" : "#888";

  const venda  = parseFloat(values[ch.key] || "") || 0;
  const tipoML = values[`tipo_${ch.key}`] || "Classico";
  const frete  = parseFloat(values[`frete_${ch.key}`] || "") || 0;
  const result = custo > 0 && venda > 0 ? calcLucro(venda, custo, tipoML, frete) : null;
  const showTipo  = ch.key !== "sc";
  const showFrete = ch.key !== "sc";

  return (
    <div style={{ background: bg, border, borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: result ? 10 : 0, flexWrap: "wrap" }}>
        <span style={{ color, fontWeight: 800, fontSize: 13, minWidth: 140 }}>{ch.label}</span>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: subColor, fontSize: 12 }}>Venda R$</span>
            <input type="number" placeholder="0.00" value={values[ch.key] || ""}
              onChange={e => onChange(ch.key, e.target.value)}
              style={{ width: 90, background: inputBg, border: inputBorder, borderRadius: 6, color: inputColor, padding: "5px 8px", fontSize: 13 }} />
          </div>

          {showTipo && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: subColor, fontSize: 12 }}>Tipo</span>
              <select value={tipoML} onChange={e => onChange(`tipo_${ch.key}`, e.target.value)}
                style={{ background: inputBg, border: inputBorder, borderRadius: 6, color: inputColor, padding: "5px 8px", fontSize: 12 }}>
                {Object.keys(TAXAS).map(t => (
                  <option key={t} value={t}>{t} ({(TAXAS[t]*100).toFixed(0)}%)</option>
                ))}
              </select>
            </div>
          )}

          {showFrete && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: subColor, fontSize: 12 }}>Frete R$</span>
              <input type="number" placeholder="0.00" value={values[`frete_${ch.key}`] || ""}
                onChange={e => onChange(`frete_${ch.key}`, e.target.value)}
                style={{ width: 75, background: inputBg, border: inputBorder, borderRadius: 6, color: inputColor, padding: "5px 8px", fontSize: 13 }} />
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", minWidth: 130 }}>
          {result ? <LucroTag lucroR={result.lucroR} lucroP={result.lucroP} /> : <span style={{ color: subColor, fontSize: 12 }}>—</span>}
        </div>
      </div>

      {result && (
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: subColor, paddingTop: 8, borderTop: dark ? "1px solid #1e1e1e" : "1px solid #e5e5e5", flexWrap: "wrap" }}>
          <span>Impostos: <b style={{ color: dark ? "#888" : "#444" }}>R$ {result.impostos.toFixed(2)}</b></span>
          {showTipo && <span>Taxa {tipoML}: <b style={{ color: dark ? "#888" : "#444" }}>R$ {result.taxa.toFixed(2)}</b></span>}
          {showFrete && frete > 0 && <span>Frete: <b style={{ color: dark ? "#888" : "#444" }}>R$ {frete.toFixed(2)}</b></span>}
          <span>Custo: <b style={{ color: dark ? "#888" : "#444" }}>R$ {custo.toFixed(2)}</b></span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [dark, setDark]                   = useState(true);
  const [products, setProducts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [search, setSearch]               = useState("");
  const [selected, setSelected]           = useState(null);
  const [custoManual, setCustoManual]     = useState("");
  const [values, setValues]               = useState({});
  const [showDropdown, setShowDropdown]   = useState(false);

  const D = {
    bg:        dark ? "#0a0a0a" : "#f5f5f5",
    text:      dark ? "#e8e8e8" : "#111",
    card:      dark ? "#111"    : "#fff",
    border:    dark ? "#222"    : "#ddd",
    input:     dark ? "#0a0a0a" : "#fff",
    inputBorder: dark ? "#333"  : "#ccc",
    inputText: dark ? "#fff"    : "#111",
    sub:       dark ? "#666"    : "#888",
    sub2:      dark ? "#555"    : "#999",
    readOnly:  dark ? "#0d0d0d" : "#f0f0f0",
    readOnlyText: dark ? "#666" : "#888",
    btnBg:     dark ? "#1a1a1a" : "#eee",
    btnText:   dark ? "#666"    : "#444",
  };

  useEffect(() => {
    fetch(CSV_URL)
      .then(r => r.text())
      .then(text => { setProducts(parseCSV(text)); setLoading(false); })
      .catch(() => { setError("Erro ao carregar planilha."); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (!search) return products.slice(0, 10);
    const q = search.toLowerCase();
    return products.filter(p =>
      p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [search, products]);

  const custo = selected
    ? (parseFloat(custoManual) || selected.custo || 0)
    : (parseFloat(custoManual) || 0);

  const handleSelect = (p) => {
    setSelected(p);
    setSearch(p.nome);
    setCustoManual(p.custo ? p.custo.toString() : "");
    const v = {};
    CHANNELS.forEach(ch => {
      const precoSheet = p.precos?.[ch.key];
      if (precoSheet) v[ch.key] = precoSheet.toString();
    });
    setValues(v);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSelected(null); setSearch(""); setCustoManual(""); setValues({});
  };

  const handleChange = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const summary = CHANNELS.map(ch => {
    const venda  = parseFloat(values[ch.key] || "") || 0;
    const tipoML = values[`tipo_${ch.key}`] || "Classico";
    const frete  = parseFloat(values[`frete_${ch.key}`] || "") || 0;
    if (!venda || !custo) return null;
    return { ...ch, ...calcLucro(venda, custo, tipoML, frete) };
  }).filter(Boolean);

  return (
    <div style={{ minHeight: "100vh", background: D.bg, color: D.text, fontFamily: "'DM Sans','Inter',sans-serif", padding: "24px 16px", transition: "background 0.2s, color 0.2s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ maxWidth: 820, margin: "0 auto 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#ff6b35,#ff9900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff" }}>SC</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>Smart Can</div>
              <div style={{ fontSize: 11, color: D.sub, letterSpacing: 1 }}>CALCULADORA DE PREÇOS</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {loading && <span style={{ fontSize: 12, color: D.sub }}>Carregando...</span>}
            {!loading && !error && <span style={{ fontSize: 12, color: "#16a34a" }}>✓ {products.length} produtos</span>}
            {error && <span style={{ fontSize: 12, color: "#dc2626" }}>{error}</span>}
            {/* Toggle */}
            <button onClick={() => setDark(!dark)}
              style={{
                background: dark ? "#1a1a1a" : "#e5e5e5",
                border: dark ? "1px solid #333" : "1px solid #ccc",
                borderRadius: 20, padding: "6px 12px", cursor: "pointer",
                fontSize: 14, color: D.text, display: "flex", alignItems: "center", gap: 6,
              }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Product Search */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: D.sub, marginBottom: 10, letterSpacing: 0.5 }}>PRODUTO</div>

          <div style={{ position: "relative" }}>
            <input type="text" placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); setSelected(null); }}
              onFocus={() => setShowDropdown(true)}
              style={{ width: "100%", background: D.input, border: `1px solid ${D.inputBorder}`, borderRadius: 8, color: D.inputText, padding: "10px 14px", fontSize: 14, boxSizing: "border-box" }} />

            {showDropdown && filtered.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: dark ? "#161616" : "#fff", border: `1px solid ${D.border}`, borderRadius: 8, zIndex: 100, maxHeight: 280, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                {filtered.map(p => (
                  <div key={p.sku} onClick={() => handleSelect(p)}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={e => e.currentTarget.style.background = dark ? "#1f1f1f" : "#f5f5f5"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div>
                      <div style={{ fontSize: 13, color: D.text, marginBottom: 2 }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: D.sub }}>{p.sku}</div>
                    </div>
                    {p.custo && <div style={{ fontSize: 12, color: "#ff6b35", fontWeight: 700, marginLeft: 12, whiteSpace: "nowrap" }}>R$ {p.custo.toFixed(2)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: D.sub, marginBottom: 6 }}>SKU</div>
              <input type="text" value={selected?.sku || ""} readOnly placeholder="—"
                style={{ width: "100%", background: D.readOnly, border: `1px solid ${D.border}`, borderRadius: 6, color: D.readOnlyText, padding: "8px 12px", fontSize: 12, boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: D.sub, marginBottom: 6 }}>CUSTO (R$)</div>
              <input type="number" placeholder="0.00" value={custoManual}
                onChange={e => setCustoManual(e.target.value)}
                style={{ width: "100%", background: D.input, border: `1px solid ${D.inputBorder}`, borderRadius: 6, color: D.inputText, padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button onClick={handleClear}
                style={{ background: D.btnBg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.btnText, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
                Limpar
              </button>
            </div>
          </div>
        </div>

        {/* Channel Rows */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: D.sub, marginBottom: 14, letterSpacing: 0.5 }}>
            PREÇOS POR CANAL — Imposto 10% sobre venda
          </div>
          {CHANNELS.map(ch => (
            <ChannelRow key={ch.key} ch={ch} custo={custo} values={values} onChange={handleChange} dark={dark} />
          ))}
        </div>

        {/* Summary */}
        {summary.length > 0 && (
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: D.sub, marginBottom: 14, letterSpacing: 0.5 }}>RESUMO</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {summary.map(ch => (
                <div key={ch.key} style={{ background: dark ? ch.bgD : ch.bgL, border: `1px solid ${dark ? ch.colorD : ch.colorL}33`, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: dark ? ch.colorD : ch.colorL, marginBottom: 6, fontWeight: 700 }}>{ch.label}</div>
                  <LucroTag lucroR={ch.lucroR} lucroP={ch.lucroP} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showDropdown && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setShowDropdown(false)} />
      )}
    </div>
  );
}
