import { useState, useMemo, useEffect } from "react";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLX4ElvfcdFRFotB1ZYYs-YI-KdS4CqgTLSbzD84XUeBuqGqApjetOaA6oqpf41WCrERbMnhWY7mYx/pub?gid=393936923&single=true&output=csv";

const TAXAS = { Normal: 0, Classico: 0.14, Premium: 0.19 };
const IMPOSTO_RATE = 0.10;

const CHANNELS = [
  { key: "sc",            label: "Smart Can",           color: "#ff6b35", bg: "#1a0f0a" },
  { key: "ml",            label: "ML s/ Frete",         color: "#ffe600", bg: "#1a1800" },
  { key: "ml_frete",      label: "ML Frete Grátis",     color: "#ffd000", bg: "#1a1500" },
  { key: "amazon",        label: "Amazon",               color: "#ff9900", bg: "#1a1000" },
  { key: "amazon_frete",  label: "Amazon Frete Grátis", color: "#ffb347", bg: "#1a1200" },
  { key: "shopee",        label: "Shopee",               color: "#ff4d00", bg: "#1a0800" },
  { key: "shopee_frete",  label: "Shopee Frete Grátis", color: "#ff6633", bg: "#1a0a00" },
];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());

  // Find column indices
  const idx = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
  const iSKU     = idx("SKU");
  const iNome    = idx("Nome do Produto (PT-BR)");
  const iCusto   = idx("Preço de compra");
  const iSC      = idx("Preço de venda SC");
  const iML      = idx("Preço de venda ML(R$)");
  const iMLF     = idx("Preço de venda ML Frete");
  const iAMZ     = idx("Preço de venda Amazon (R$)");
  const iAMZF    = idx("Preço de venda Amazon Frete");
  const iSHP     = idx("Preço de venda Shopee (R$)");
  const iSHPF    = idx("Preço de venda Shopee Frete");

  const parseR = (v) => {
    if (!v) return null;
    const n = parseFloat(v.replace(/[^0-9.,]/g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  };

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const cols = [];
    let cur = "", inQ = false;
    for (let c of line) {
      if (c === '"') { inQ = !inQ; }
      else if (c === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    cols.push(cur.trim());

    const sku = cols[iSKU]?.replace(/"/g, "").trim();
    if (!sku) return null;

    return {
      sku,
      nome:        cols[iNome]?.replace(/"/g, "").trim() || sku,
      custo:       parseR(cols[iCusto]),
      precos: {
        sc:           parseR(cols[iSC]),
        ml:           parseR(cols[iML]),
        ml_frete:     parseR(cols[iMLF]),
        amazon:       parseR(cols[iAMZ]),
        amazon_frete: parseR(cols[iAMZF]),
        shopee:       parseR(cols[iSHP]),
        shopee_frete: parseR(cols[iSHPF]),
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
  if (lucroR === null || lucroR === undefined) return <span style={{ color: "#555" }}>—</span>;
  const color = lucroR > 0 ? "#4ade80" : lucroR === 0 ? "#fbbf24" : "#f87171";
  return (
    <span style={{ color, fontWeight: 700, fontSize: 13 }}>
      {lucroR > 0 ? "+" : ""}R$ {lucroR.toFixed(2)} ({lucroP.toFixed(1)}%)
    </span>
  );
}

function ChannelRow({ ch, custo, values, onChange }) {
  const venda  = parseFloat(values[ch.key] || "") || 0;
  const tipoML = values[`tipo_${ch.key}`] || "Classico";
  const frete  = parseFloat(values[`frete_${ch.key}`] || "") || 0;
  const result = custo > 0 && venda > 0 ? calcLucro(venda, custo, tipoML, frete) : null;
  const showTipo  = ch.key !== "sc";
  const showFrete = ch.key !== "sc";

  return (
    <div style={{
      background: ch.bg, border: `1px solid ${ch.color}22`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: result ? 10 : 0, flexWrap: "wrap" }}>
        <span style={{ color: ch.color, fontWeight: 800, fontSize: 13, minWidth: 140 }}>{ch.label}</span>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#888", fontSize: 12 }}>Venda R$</span>
            <input type="number" placeholder="0.00" value={values[ch.key] || ""}
              onChange={e => onChange(ch.key, e.target.value)}
              style={{ width: 90, background: "#111", border: `1px solid ${ch.color}44`, borderRadius: 6, color: "#fff", padding: "5px 8px", fontSize: 13 }} />
          </div>

          {showTipo && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#888", fontSize: 12 }}>Tipo</span>
              <select value={tipoML} onChange={e => onChange(`tipo_${ch.key}`, e.target.value)}
                style={{ background: "#111", border: `1px solid ${ch.color}44`, borderRadius: 6, color: "#fff", padding: "5px 8px", fontSize: 12 }}>
                {Object.keys(TAXAS).map(t => (
                  <option key={t} value={t}>{t} ({(TAXAS[t]*100).toFixed(0)}%)</option>
                ))}
              </select>
            </div>
          )}

          {showFrete && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#888", fontSize: 12 }}>Frete R$</span>
              <input type="number" placeholder="0.00" value={values[`frete_${ch.key}`] || ""}
                onChange={e => onChange(`frete_${ch.key}`, e.target.value)}
                style={{ width: 75, background: "#111", border: `1px solid ${ch.color}44`, borderRadius: 6, color: "#fff", padding: "5px 8px", fontSize: 13 }} />
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", minWidth: 130 }}>
          {result ? <LucroTag lucroR={result.lucroR} lucroP={result.lucroP} /> : <span style={{ color: "#333", fontSize: 12 }}>—</span>}
        </div>
      </div>

      {result && (
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#555", paddingTop: 8, borderTop: "1px solid #1e1e1e", flexWrap: "wrap" }}>
          <span>Impostos: <b style={{ color: "#888" }}>R$ {result.impostos.toFixed(2)}</b></span>
          {showTipo && <span>Taxa {tipoML}: <b style={{ color: "#888" }}>R$ {result.taxa.toFixed(2)}</b></span>}
          {showFrete && frete > 0 && <span>Frete: <b style={{ color: "#888" }}>R$ {frete.toFixed(2)}</b></span>}
          <span>Custo: <b style={{ color: "#888" }}>R$ {custo.toFixed(2)}</b></span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);
  const [custoManual, setCustoManual] = useState("");
  const [values, setValues]       = useState({});
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetch(CSV_URL)
      .then(r => r.text())
      .then(text => { setProducts(parseCSV(text)); setLoading(false); })
      .catch(() => { setError("Erro ao carregar planilha. Verifique a URL."); setLoading(false); });
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
    // Pre-fill channel prices from sheet
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
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8", fontFamily: "'DM Sans','Inter',sans-serif", padding: "24px 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ maxWidth: 820, margin: "0 auto 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#ff6b35,#ff9900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff" }}>SC</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>Smart Can</div>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: 1 }}>CALCULADORA DE PREÇOS</div>
            </div>
          </div>
          {loading && <span style={{ fontSize: 12, color: "#555" }}>Carregando planilha...</span>}
          {!loading && !error && <span style={{ fontSize: 12, color: "#3a3" }}>✓ {products.length} produtos carregados</span>}
          {error && <span style={{ fontSize: 12, color: "#f87171" }}>{error}</span>}
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Product Search */}
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 10, letterSpacing: 0.5 }}>PRODUTO</div>

          <div style={{ position: "relative" }}>
            <input type="text" placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); setSelected(null); }}
              onFocus={() => setShowDropdown(true)}
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 14, boxSizing: "border-box" }} />

            {showDropdown && filtered.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, zIndex: 100, maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
                {filtered.map(p => (
                  <div key={p.sku} onClick={() => handleSelect(p)}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#1f1f1f"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div>
                      <div style={{ fontSize: 13, color: "#e0e0e0", marginBottom: 2 }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{p.sku}</div>
                    </div>
                    {p.custo && <div style={{ fontSize: 12, color: "#ff6b35", fontWeight: 700, marginLeft: 12, whiteSpace: "nowrap" }}>R$ {p.custo.toFixed(2)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>SKU</div>
              <input type="text" value={selected?.sku || ""} readOnly placeholder="—"
                style={{ width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 6, color: "#666", padding: "8px 12px", fontSize: 12, boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>CUSTO (R$)</div>
              <input type="number" placeholder="0.00" value={custoManual}
                onChange={e => setCustoManual(e.target.value)}
                style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 6, color: "#fff", padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button onClick={handleClear}
                style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#666", padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
                Limpar
              </button>
            </div>
          </div>
        </div>

        {/* Channel Rows */}
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 14, letterSpacing: 0.5 }}>
            PREÇOS POR CANAL — Imposto 10% sobre venda
          </div>
          {CHANNELS.map(ch => (
            <ChannelRow key={ch.key} ch={ch} custo={custo} values={values} onChange={handleChange} />
          ))}
        </div>

        {/* Summary */}
        {summary.length > 0 && (
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 14, letterSpacing: 0.5 }}>RESUMO</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {summary.map(ch => (
                <div key={ch.key} style={{ background: ch.bg, border: `1px solid ${ch.color}33`, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: ch.color, marginBottom: 6, fontWeight: 700 }}>{ch.label}</div>
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
