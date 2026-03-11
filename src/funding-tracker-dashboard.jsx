import { useState, useEffect, useCallback, useRef } from "react";

const SOURCES = [
  { id: "cdti", label: "CDTI", color: "#0F4C81" },
  { id: "isciii", label: "ISCIII", color: "#1B813E" },
  { id: "cm", label: "Comunidad de Madrid", color: "#C41E3A" },
  { id: "horizon", label: "Horizon Europe", color: "#003399" },
  { id: "aei", label: "AEI", color: "#6B4C9A" },
  { id: "enisa", label: "ENISA", color: "#2E86AB" },
  { id: "fecyt", label: "FECYT", color: "#8B5CF6" },
  { id: "redes", label: "Red.es / ICEX", color: "#0891B2" },
  { id: "eit", label: "EIT Health / AAL", color: "#059669" },
  { id: "eranet", label: "ERA-NET / COST", color: "#1D4ED8" },
  { id: "fundacion", label: "Fundaciones Privadas", color: "#B8860B" },
  { id: "agregador", label: "Agregadores", color: "#78716C" },
  { id: "otra", label: "Otra", color: "#555" },
];

const STATUS_MAP = {
  open: { label: "Abierta", color: "#1B813E", bg: "#E8F5E9" },
  upcoming: { label: "Próxima", color: "#E67E22", bg: "#FFF3E0" },
  closed: { label: "Cerrada", color: "#999", bg: "#F5F5F5" },
  applied: { label: "Solicitada", color: "#0F4C81", bg: "#E3F2FD" },
  descartada: { label: "Descartada", color: "#777", bg: "#EEEEEE" },
};

const ELEGIBILITY = [
  "Empresa privada",
  "Empresa + Centro público (consorcio)",
  "Centro acreditado SNS",
  "Doctorado Industrial",
  "Investigador principal",
  "Sin restricción",
];

const INITIAL_CALLS = [
  {
    id: "1", title: "Doctorados Industriales - Comunidad de Madrid (conv. 2025/2026)", source: "cm",
    url: "https://www.comunidad.madrid/inversion/innova/ayudas-doctorados-industriales",
    deadline: "2026-12-31", status: "upcoming", elegibility: "Doctorado Industrial",
    budget: "~32.900€/año contratación + 40.000€ proyecto + 1.500€ matrícula",
    notes: "Convocatoria anual (última: conv. 2024, BOCM 30/12/2024). La conv. 2025 aún no publicada, se espera ~finales 2026. Requiere empresa con sede en CM + entidad académica.", starred: true,
  },
  {
    id: "2", title: "Doctorados Industriales AEI - Convocatoria 2025", source: "aei",
    url: "https://www.aei.gob.es/convocatorias/buscador-convocatorias/ayudas-contratos-formacion-doctores-doctoras-empresas-otras-13",
    deadline: "2026-02-17", status: "closed", elegibility: "Doctorado Industrial",
    budget: "8M€ totales · Contratos de 4 años",
    notes: "Plazo cerrado 17/02/2026. La próxima conv. 2026 se espera ~oct-nov 2026.", starred: true,
  },
  {
    id: "3", title: "CDTI - Proyectos de I+D (PID)", source: "cdti",
    url: "https://www.cdti.es/ayudas/convocatorias-ayudas-702",
    deadline: "2026-12-31", status: "open", elegibility: "Empresa privada",
    budget: "Mín. 175.000€ · Financiación hasta 85%",
    notes: "Convocatoria abierta permanente. Ideal para el proyecto de wearable/espasticidad.", starred: true,
  },
  {
    id: "4", title: "CDTI - Línea de Innovación", source: "cdti",
    url: "https://www.cdti.es/ayudas/convocatorias-ayudas-702",
    deadline: "2026-12-31", status: "open", elegibility: "Empresa privada",
    budget: "Variable · Préstamo bonificado",
    notes: "Convocatoria abierta permanente. Proyectos cercanos a mercado.", starred: false,
  },
  {
    id: "5", title: "CDTI - Misiones Ciencia e Innovación 2026", source: "cdti",
    url: "https://www.cdti.es/", deadline: "2026-06-30", status: "upcoming",
    elegibility: "Empresa + Centro público (consorcio)", budget: "~90M€ en subvenciones FEDER",
    notes: "Grandes proyectos colaborativos. Ventana probable primavera 2026.", starred: true,
  },
  {
    id: "6", title: "AES 2026 - Proyectos de I+D+I en Salud (ISCIII)", source: "isciii",
    url: "https://www.isciii.es/financiacion/aes/como-solicitar",
    bases_url: "https://www.iisaragon.es/wp-content/uploads/2025/12/AES_2026.pdf",
    deadline: "2026-03-17", status: "open",
    elegibility: "Centro acreditado SNS", budget: "152M€ totales AES · Proyectos 3-4 años",
    notes: "Plazo: 17/feb - 17/mar 2026. Requiere vinculación con SNS. Neuron podría participar a través de colaboración con centro acreditado.", starred: true,
  },
  {
    id: "7", title: "AES 2026 - Desarrollo Tecnológico en Salud (DTS)", source: "isciii",
    url: "https://www.isciii.es/financiacion/aes/como-solicitar",
    deadline: "2026-03-10", status: "closed",
    elegibility: "Centro acreditado SNS", budget: "Variable",
    notes: "Plazo cerrado 10/03/2026. Preparar para AES 2027.", starred: false,
  },
  {
    id: "8", title: "AES 2026 - Investigación Clínica Independiente", source: "isciii",
    url: "https://www.isciii.es/financiacion/aes/como-solicitar",
    bases_url: "https://www.iisaragon.es/wp-content/uploads/2025/12/AES_2026.pdf",
    deadline: "2026-03-11", status: "open",
    elegibility: "Centro acreditado SNS", budget: "Variable · 4-6 años",
    notes: "Plazo: 11/feb - 11/mar 2026. Validación clínica de wearable.", starred: false,
  },
  {
    id: "9", title: "AES 2026 - Colaboración Internacional", source: "isciii",
    url: "https://www.isciii.es/financiacion/aes/como-solicitar",
    deadline: "2026-10-29", status: "upcoming",
    elegibility: "Centro acreditado SNS", budget: "Variable",
    notes: "Plazo: 1-29 octubre 2026. BrainHealth JTC1 y JTC2.", starred: true,
  },
  {
    id: "10", title: "Horizon Europe - HLTH-2026-01-TOOL-03 (NAMs biomedical research)", source: "horizon",
    url: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals?callIdentifier=HORIZON-HLTH-2026-01",
    bases_url: "https://research-and-innovation.ec.europa.eu/document/download/36c7287d-d38f-4a96-94ca-0dfce1375a48_en",
    deadline: "2026-04-16", status: "open", elegibility: "Empresa + Centro público (consorcio)",
    budget: "Hasta 10M€ por proyecto · Financiación hasta 100%",
    notes: "Deadline 16/04/2026. Consorcio mín. 3 países.", starred: true,
  },
  {
    id: "11", title: "Horizon Europe 2027 - Addressing disabilities", source: "horizon",
    url: "https://research-and-innovation.ec.europa.eu/", deadline: "2027-04-15", status: "upcoming",
    elegibility: "Empresa + Centro público (consorcio)", budget: "Hasta 10M€",
    notes: "Encaje perfecto con neurorrehabilitación y wearables.", starred: true,
  },
  {
    id: "12", title: "CaixaResearch - Investigación en Salud 2026", source: "fundacion",
    url: "https://caixaresearch.org/", deadline: "2025-11-19", status: "closed",
    elegibility: "Sin restricción", budget: "Hasta 500.000€/proyecto",
    notes: "Cerrada (nov 2025). Próxima edición ~septiembre 2026.", starred: false,
  },
  {
    id: "13", title: "CaixaResearch - Promoción de la Salud 2026", source: "fundacion",
    url: "https://caixaresearch.org/", deadline: "2026-02-25", status: "closed",
    elegibility: "Sin restricción", budget: "80K-500K por proyecto",
    notes: "Plazo cerrado 25/02/2026. Próxima edición pendiente.", starred: false,
  },
  {
    id: "14", title: "Fundación BBVA - Ayudas a Equipos 2026", source: "fundacion",
    url: "https://www.fbbva.es/investigacion/", deadline: "2026-09-30", status: "upcoming",
    elegibility: "Investigador principal", budget: "~100-200K por proyecto",
    notes: "Apertura habitual en verano. Vía colaboración con CSIC.", starred: false,
  },
  {
    id: "15", title: "Programa LÁNZATE - Comunidad de Madrid (1ª edición 2026)", source: "cm",
    url: "https://www.comunidad.madrid/noticias/2026/02/25/comunidad-madrid-crea-programa-lanzate-promover-doble-carrera-clinica-cientifica-investigadores-emergentes",
    bases_url: "https://www.comunidad.madrid/file/514616/download",
    deadline: "2026-03-18", status: "open", elegibility: "Centro acreditado SNS",
    budget: "~1M€ total · Proyectos hasta 2 años · Equipamiento, fungible, PI",
    notes: "1ª edición. Doble carrera clínica-investigadora. Requiere IIS públicos acreditados.", starred: true,
  },
];

// ─── Helpers ───

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function autoClassify(call) {
  if (!call.auto_detected) return call;
  if (call.status === "descartada" || call.status === "applied") return call;
  const days = daysUntil(call.deadline);
  if (days === null) return { ...call, status: "open" };
  if (days < 0) return { ...call, status: "closed" };
  if (days > 30) return { ...call, status: "upcoming" };
  return { ...call, status: "open" };
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

// ─── GitHub Persistence ───

const GH_REPO = "Alfrelerin/radar-convocatorias";
const GH_EDITS_PATH = "user_edits.json";

async function ghLoadEdits(token) {
  try {
    const resp = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${GH_EDITS_PATH}`, {
      headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return { content: JSON.parse(atob(data.content)), sha: data.sha };
  } catch { return null; }
}

async function ghSaveEdits(token, edits, sha) {
  try {
    const body = {
      message: "Update user edits [skip ci]",
      content: btoa(unescape(encodeURIComponent(JSON.stringify(edits, null, 2)))),
    };
    if (sha) body.sha = sha;
    const resp = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${GH_EDITS_PATH}`, {
      method: "PUT",
      headers: { Authorization: `token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.content.sha;
    }
  } catch (e) { console.error("GitHub save error:", e); }
  return sha;
}

// ─── UI Components ───

const Modal = ({ children, onClose }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={onClose}>
    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 560, width: "90%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

const Badge = ({ text, color, bg }) => (
  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", color, background: bg, textTransform: "uppercase" }}>
    {text}
  </span>
);

const UrgencyBar = ({ days }) => {
  if (days === null || days < 0) return null;
  const pct = Math.min(100, Math.max(0, (days / 90) * 100));
  const color = days <= 14 ? "#C41E3A" : days <= 30 ? "#E67E22" : "#1B813E";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <div style={{ flex: 1, height: 4, background: "#eee", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${100 - pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, whiteSpace: "nowrap" }}>
        {days === 0 ? "¡HOY!" : days === 1 ? "1 día" : `${days} días`}
      </span>
    </div>
  );
};

// ─── Urgent Alerts Panel ───

const UrgentAlerts = ({ calls, onEdit }) => {
  const urgent = calls
    .filter((c) => {
      const d = daysUntil(c.deadline);
      return d !== null && d >= 0 && d <= 14 && c.status !== "closed" && c.status !== "descartada";
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 4);

  if (urgent.length === 0) return null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 32px 0" }}>
      <div style={{
        background: "linear-gradient(135deg, #FEE2E2 0%, #FFF1F1 100%)",
        borderRadius: 12, padding: "16px 20px", border: "1px solid #FECACA",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", marginBottom: 10 }}>
          🚨 Deadlines inminentes (próximos 14 días)
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {urgent.map((c) => {
            const days = daysUntil(c.deadline);
            const source = SOURCES.find((s) => s.id === c.source) || SOURCES[12];
            return (
              <div
                key={c.id}
                onClick={() => onEdit(c)}
                style={{
                  flex: "1 1 200px", minWidth: 200, background: "#fff", borderRadius: 8,
                  padding: "10px 14px", cursor: "pointer", borderLeft: `3px solid ${days <= 3 ? "#DC2626" : "#F59E0B"}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)", transition: "transform 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div style={{ fontSize: 11, color: source.color, fontWeight: 600, marginBottom: 2 }}>{source.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3 }}>
                  {c.title.length > 50 ? c.title.slice(0, 50) + "…" : c.title}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: days <= 3 ? "#DC2626" : "#F59E0B", marginTop: 4 }}>
                  {days === 0 ? "¡HOY!" : days === 1 ? "⏰ Mañana" : `⏰ ${days} días`}
                  <span style={{ fontWeight: 400, color: "#999", marginLeft: 6 }}>{formatDate(c.deadline)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Table Row ───

const TableRow = ({ call, onEdit, onToggleStar, onDiscard, onRecover }) => {
  const source = SOURCES.find((s) => s.id === call.source) || SOURCES[12];
  const status = STATUS_MAP[call.status] || STATUS_MAP.open;
  const days = daysUntil(call.deadline);
  const urgColor = days !== null && days >= 0 ? (days <= 14 ? "#DC2626" : days <= 30 ? "#E67E22" : "#1B813E") : "#999";

  return (
    <tr
      style={{ cursor: "pointer", borderBottom: "1px solid #f0f0f0", transition: "background 0.1s" }}
      onClick={() => onEdit(call)}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <td style={{ padding: "10px 8px", width: 30, textAlign: "center" }}>
        <span
          onClick={(e) => { e.stopPropagation(); onToggleStar(call.id); }}
          style={{ cursor: "pointer", color: call.starred ? "#E67E22" : "#ddd", fontSize: 16 }}
        >★</span>
      </td>
      <td style={{ padding: "10px 8px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3 }}>
          {call.title.length > 60 ? call.title.slice(0, 60) + "…" : call.title}
        </div>
        {call.elegibility && <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>{call.elegibility}</div>}
      </td>
      <td style={{ padding: "10px 8px" }}>
        <Badge text={source.label} color={source.color} bg={source.color + "15"} />
      </td>
      <td style={{ padding: "10px 8px" }}>
        <Badge text={status.label} color={status.color} bg={status.bg} />
      </td>
      <td style={{ padding: "10px 8px", fontSize: 12, color: "#666", whiteSpace: "nowrap" }}>
        {formatDate(call.deadline)}
      </td>
      <td style={{ padding: "10px 8px", textAlign: "center" }}>
        {call.status !== "closed" && call.status !== "descartada" && days !== null && days >= 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: urgColor }}>
            {days === 0 ? "¡HOY!" : `${days}d`}
          </span>
        )}
      </td>
      <td style={{ padding: "10px 8px", fontSize: 11, color: "#999", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {call.budget || "—"}
      </td>
      <td style={{ padding: "10px 4px", textAlign: "center", whiteSpace: "nowrap" }}>
        {call.status === "descartada" ? (
          <span onClick={(e) => { e.stopPropagation(); onRecover(call.id); }} style={{ cursor: "pointer", color: "#1B813E", fontSize: 14, padding: "0 4px" }} title="Recuperar">↩</span>
        ) : (
          <span onClick={(e) => { e.stopPropagation(); onDiscard(call.id); }} style={{ cursor: "pointer", color: "#ccc", fontSize: 14, padding: "0 4px" }} title="Descartar">⊘</span>
        )}
      </td>
    </tr>
  );
};

// ─── Card (existing, cleaned up) ───

const CallCard = ({ call, onEdit, onToggleStar, onDelete, onDiscard, onRecover }) => {
  const source = SOURCES.find((s) => s.id === call.source) || SOURCES[12];
  const status = STATUS_MAP[call.status] || STATUS_MAP.open;
  const days = daysUntil(call.deadline);
  return (
    <div
      style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", borderLeft: `4px solid ${source.color}`, transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer", position: "relative" }}
      onClick={() => onEdit(call)}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1), 0 8px 32px rgba(0,0,0,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <Badge text={source.label} color={source.color} bg={source.color + "15"} />
            <Badge text={status.label} color={status.color} bg={status.bg} />
            {call.elegibility && <span style={{ fontSize: 11, color: "#888" }}>{call.elegibility}</span>}
            {call.auto_detected && !call.deadline_confirmed && (
              <span style={{ fontSize: 10, color: "#E67E22", fontWeight: 600 }} title="La fecha no fue extraída automáticamente, puede no ser exacta">⚠️ Fecha sin confirmar</span>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.35 }}>{call.title}</h3>
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#666" }}>📅 {formatDate(call.deadline)}</span>
            {call.budget && <span style={{ fontSize: 12, color: "#666" }}>💰 {call.budget}</span>}
          </div>
          {call.status !== "closed" && call.status !== "applied" && call.status !== "descartada" && <UrgencyBar days={days} />}
          {/* Requirements section */}
          {call.elegibility && call.elegibility.length > 15 && (
            <div style={{ margin: "6px 0 0", padding: "4px 8px", background: "#F0F7FF", borderRadius: 6, fontSize: 11, color: "#2563EB", lineHeight: 1.4 }}>
              📋 <strong>Requisitos:</strong> {call.elegibility.length > 100 ? call.elegibility.slice(0, 100) + "…" : call.elegibility}
            </div>
          )}
          {call.notes && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#777", lineHeight: 1.5 }}>{call.notes.length > 120 ? call.notes.slice(0, 120) + "…" : call.notes}</p>}
          {/* Links row */}
          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            {call.url && (
              <a href={call.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, color: "#2C5364", textDecoration: "none", fontWeight: 600 }}>
                🔗 Ver convocatoria
              </a>
            )}
            {call.bases_url && (
              <a href={call.bases_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, color: "#7C3AED", textDecoration: "none", fontWeight: 600 }}>
                📄 Bases oficiales
              </a>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); onToggleStar(call.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 4, color: call.starred ? "#E67E22" : "#ddd" }} title={call.starred ? "Quitar favorito" : "Favorito"}>★</button>
          {call.status === "descartada" ? (
            <button onClick={(e) => { e.stopPropagation(); onRecover(call.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 4, color: "#1B813E", fontWeight: 600 }} title="Recuperar">↩</button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onDiscard(call.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 4, color: "#ccc" }} onMouseEnter={(e) => (e.target.style.color = "#E67E22")} onMouseLeave={(e) => (e.target.style.color = "#ccc")} title="Descartar">⊘</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(call.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 4, color: "#ccc" }} onMouseEnter={(e) => (e.target.style.color = "#C41E3A")} onMouseLeave={(e) => (e.target.style.color = "#ccc")} title="Eliminar">✕</button>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text", placeholder, required, options, textarea }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 }}>
      {label} {required && <span style={{ color: "#C41E3A" }}>*</span>}
    </label>
    {options ? (
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, background: "#fafafa", outline: "none", fontFamily: "inherit" }}>
        <option value="">Seleccionar...</option>
        {options.map((o) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : textarea ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, background: "#fafafa", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
    ) : (
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, background: "#fafafa", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
    )}
  </div>
);

const EMPTY_FORM = { title: "", source: "", url: "", deadline: "", status: "upcoming", elegibility: "", budget: "", bases_url: "", notes: "", starred: false };

// ─── Main Component ───

export default function FundingTracker() {
  const [calls, setCalls] = useState(INITIAL_CALLS);
  const [filter, setFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCall, setEditingCall] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoCount, setAutoCount] = useState(0);
  const [viewMode, setViewMode] = useState("cards"); // "cards" or "table"
  const [ghToken, setGhToken] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [ghStatus, setGhStatus] = useState(""); // "", "saving", "saved", "error"
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"
  const ghShaRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Build edits object from current calls state
  const buildEdits = useCallback(() => {
    const baseIds = new Set(INITIAL_CALLS.map((c) => c.id));
    const added = calls.filter((c) => !baseIds.has(c.id) && !c.auto_detected);
    const discarded = calls.filter((c) => c.status === "descartada").map((c) => c.id);
    const deleted = [];
    const modified = {};
    calls.forEach((c) => {
      const cid = c.id;
      if (baseIds.has(cid) || c.auto_detected) {
        // Always track status + starred for any known call
        modified[cid] = { status: c.status, starred: !!c.starred };
        if (c._prevStatus) modified[cid]._prevStatus = c._prevStatus;
      }
    });
    const currentIds = new Set(calls.map((c) => c.id));
    INITIAL_CALLS.forEach((c) => { if (!currentIds.has(c.id)) deleted.push(c.id); });
    return { added, deleted, modified, discarded };
  }, [calls]);

  // Force save function (called by button or auto-save)
  const forceSave = useCallback(async () => {
    if (!loaded || calls.length === 0) return;
    const edits = buildEdits();
    setSaveStatus("saving");

    // Always save to localStorage
    try {
      localStorage.setItem("funding-calls-user-edits", JSON.stringify(edits));
    } catch (e) { console.error("localStorage save error:", e); }

    // Save to GitHub if token available
    if (ghToken) {
      setGhStatus("saving");
      const newSha = await ghSaveEdits(ghToken, edits, ghShaRef.current);
      ghShaRef.current = newSha;
      setGhStatus(newSha ? "saved" : "error");
      setTimeout(() => setGhStatus(""), 3000);
    }

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(""), 2000);
  }, [loaded, calls, ghToken, buildEdits]);

  // Load data
  useEffect(() => {
    (async () => {
      let baseCalls = INITIAL_CALLS;

      // 1. Load calls.json from monitor
      try {
        const base = import.meta.env.BASE_URL || "/radar-convocatorias/";
        const resp = await fetch(`${base}calls.json?t=${Date.now()}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.calls && data.calls.length > 0) {
            baseCalls = data.calls;
            setLastUpdated(data.last_updated);
            setAutoCount(data.auto_count || 0);
          }
        }
      } catch (e) { console.log("calls.json not available", e); }

      // 2. Load GitHub token from localStorage
      let token = "";
      try {
        const t = localStorage.getItem("gh-token");
        if (t) { token = t; setGhToken(t); }
      } catch {}

      // 3. Load user edits (GitHub first, then localStorage fallback)
      let userEdits = null;
      if (token) {
        const gh = await ghLoadEdits(token);
        if (gh) { userEdits = gh.content; ghShaRef.current = gh.sha; }
      }
      if (!userEdits) {
        try {
          const raw = localStorage.getItem("funding-calls-user-edits");
          if (raw) userEdits = JSON.parse(raw);
        } catch {}
      }

      if (userEdits) {
        const deletedIds = new Set(userEdits.deleted || []);
        const modified = userEdits.modified || {};
        const discardedIds = new Set(userEdits.discarded || []);
        baseCalls = baseCalls
          .filter((c) => !deletedIds.has(c.id))
          .map((c) => {
            let updated = modified[c.id] ? { ...c, ...modified[c.id] } : c;
            if (discardedIds.has(c.id) && updated.status !== "descartada") {
              updated = { ...updated, status: "descartada", _prevStatus: updated.status };
            }
            return updated;
          });
        if (userEdits.added) baseCalls = [...baseCalls, ...userEdits.added];
      }

      baseCalls = baseCalls.map(autoClassify);
      setCalls(baseCalls);
      setLoaded(true);
    })();
  }, []);

  // Auto-save user edits (debounced 2s)
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { forceSave(); }, 2000);
  }, [calls, loaded]);

  const updateForm = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const openNew = () => { setEditingCall(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (call) => { setEditingCall(call); setForm({ ...call }); setShowModal(true); };
  const saveCall = () => {
    if (!form.title || !form.source) return;
    if (editingCall) setCalls((prev) => prev.map((c) => (c.id === editingCall.id ? { ...form, id: editingCall.id } : c)));
    else setCalls((prev) => [...prev, { ...form, id: Date.now().toString() }]);
    setShowModal(false);
  };
  const deleteCall = (id) => setCalls((prev) => prev.filter((c) => c.id !== id));
  const toggleStar = (id) => setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)));
  const discardCall = (id) => setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status: "descartada", _prevStatus: c.status } : c)));
  const recoverCall = (id) => setCalls((prev) => prev.map((c) => {
    if (c.id !== id) return c;
    const restored = { ...c, status: c._prevStatus || "open" };
    delete restored._prevStatus;
    return c.auto_detected ? autoClassify(restored) : restored;
  }));
  const resetData = () => setCalls(INITIAL_CALLS);

  const saveGhToken = async (token) => {
    setGhToken(token);
    try { localStorage.setItem("gh-token", token); } catch {}
    if (token) {
      const gh = await ghLoadEdits(token);
      if (gh) ghShaRef.current = gh.sha;
    }
    setShowSettings(false);
  };

  // Filtering & sorting
  const filtered = calls
    .filter((c) => {
      if (filter === "descartada") return c.status === "descartada";
      if (filter === "starred") return c.starred && c.status !== "descartada";
      if (filter === "urgent") { const d = daysUntil(c.deadline); return d !== null && d >= 0 && d <= 30 && c.status !== "closed" && c.status !== "descartada"; }
      if (filter === "all") return c.status !== "descartada";
      if (c.status !== filter) return false;
      return true;
    })
    .filter((c) => sourceFilter === "all" || c.source === sourceFilter)
    .filter((c) => { if (!search) return true; const q = search.toLowerCase(); return c.title.toLowerCase().includes(q) || (c.notes || "").toLowerCase().includes(q); })
    .sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });

  // Stats
  const activeCalls = calls.filter((c) => c.status !== "descartada");
  const openCount = calls.filter((c) => c.status === "open").length;
  const upcomingCount = calls.filter((c) => c.status === "upcoming").length;
  const urgentCount = calls.filter((c) => { const d = daysUntil(c.deadline); return d !== null && d >= 0 && d <= 30 && c.status !== "closed" && c.status !== "descartada"; }).length;
  const appliedCount = calls.filter((c) => c.status === "applied").length;
  const closedCount = calls.filter((c) => c.status === "closed").length;
  const discardedCount = calls.filter((c) => c.status === "descartada").length;
  const starredCount = calls.filter((c) => c.starred && c.status !== "descartada").length;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "linear-gradient(160deg, #F0F2F5 0%, #E8EBF0 50%, #F5F0EB 100%)" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)", padding: "28px 32px 24px", color: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>
                🔬 Radar de Convocatorias
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.7 }}>
                Neuron Rehabilitación · Seguimiento de ayudas I+D
                {lastUpdated && <span style={{ marginLeft: 12, fontSize: 11, opacity: 0.6 }}>
                  Actualizado: {new Date(lastUpdated).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {autoCount > 0 && ` · ${autoCount} auto-detectadas`}
                </span>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* GitHub sync indicator */}
              {ghToken && (
                <span style={{ fontSize: 11, opacity: 0.6, padding: "4px 8px" }}>
                  {ghStatus === "saving" ? "⏳ Guardando..." : ghStatus === "saved" ? "✅ Sincronizado" : ghStatus === "error" ? "❌ Error sync" : "☁️ GitHub"}
                </span>
              )}
              <button
                onClick={() => setShowSettings(true)}
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                title="Configuración"
              >⚙️</button>
              <button
                onClick={() => forceSave()}
                style={{
                  background: saveStatus === "saved" ? "rgba(27,129,62,0.3)" : saveStatus === "saving" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.15)",
                  color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  transition: "background 0.3s",
                }}
                title="Guardar cambios"
              >{saveStatus === "saving" ? "⏳" : saveStatus === "saved" ? "✅ Guardado" : "💾 Guardar"}</button>
              <button onClick={openNew} style={{ background: "#fff", color: "#0F2027", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", fontFamily: "inherit" }}>
                + Nueva
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "Abiertas", value: openCount, icon: "🟢" },
              { label: "Urgentes (<30d)", value: urgentCount, icon: "🔴" },
              { label: "Próximas", value: upcomingCount, icon: "🟠" },
              { label: "Solicitadas", value: appliedCount, icon: "🔵" },
              { label: "Activas", value: activeCalls.length, icon: "📋" },
            ].map((s) => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 18px", backdropFilter: "blur(10px)", minWidth: 100 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{s.icon} {s.value}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Urgent Alerts */}
      <UrgentAlerts calls={calls} onEdit={openEdit} />

      {/* Filters */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 32px 0" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 13, outline: "none", minWidth: 160, fontFamily: "inherit", background: "#fff" }} />

          {[
            { id: "all", label: `Todas (${activeCalls.length})` },
            { id: "urgent", label: `🔴 Urgentes (${urgentCount})` },
            { id: "open", label: `Abiertas (${openCount})` },
            { id: "upcoming", label: `Próximas (${upcomingCount})` },
            { id: "starred", label: `★ (${starredCount})` },
            { id: "applied", label: `Solicitadas (${appliedCount})` },
            { id: "descartada", label: `Descartadas (${discardedCount})` },
            { id: "closed", label: `Cerradas (${closedCount})` },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              border: filter === f.id ? "1.5px solid #2C5364" : "1.5px solid #ddd",
              background: filter === f.id ? "#2C5364" : "#fff",
              color: filter === f.id ? "#fff" : "#555",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {f.label}
            </button>
          ))}

          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 8, fontSize: 11, border: "1.5px solid #ddd", background: "#fff", fontFamily: "inherit", color: "#555", cursor: "pointer" }}>
            <option value="all">Todos organismos</option>
            {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          {/* View toggle */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 2, background: "#e5e7eb", borderRadius: 6, padding: 2 }}>
            <button onClick={() => setViewMode("cards")} style={{ padding: "5px 10px", borderRadius: 4, fontSize: 12, border: "none", background: viewMode === "cards" ? "#fff" : "transparent", color: viewMode === "cards" ? "#1a1a1a" : "#888", cursor: "pointer", fontWeight: 600, boxShadow: viewMode === "cards" ? "0 1px 2px rgba(0,0,0,0.1)" : "none" }}>
              ☐ Cards
            </button>
            <button onClick={() => setViewMode("table")} style={{ padding: "5px 10px", borderRadius: 4, fontSize: 12, border: "none", background: viewMode === "table" ? "#fff" : "transparent", color: viewMode === "table" ? "#1a1a1a" : "#888", cursor: "pointer", fontWeight: 600, boxShadow: viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.1)" : "none" }}>
              ≡ Tabla
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {filter === "closed" && closedCount > 0 && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 32px 0" }}>
          <button onClick={() => { if (confirm(`¿Eliminar definitivamente las ${closedCount} cerradas?`)) setCalls((prev) => prev.filter((c) => c.status !== "closed")); }}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA", cursor: "pointer", fontFamily: "inherit" }}>
            🗑️ Eliminar todas las cerradas ({closedCount})
          </button>
        </div>
      )}
      {filter === "descartada" && discardedCount > 0 && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 32px 0" }}>
          <button onClick={() => { if (confirm(`¿Eliminar definitivamente las ${discardedCount} descartadas?`)) setCalls((prev) => prev.filter((c) => c.status !== "descartada")); }}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA", cursor: "pointer", fontFamily: "inherit" }}>
            🗑️ Eliminar todas las descartadas ({discardedCount})
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 32px 40px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#999", fontSize: 14 }}>
            No hay convocatorias con estos filtros.
            <br /><button onClick={openNew} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, background: "#2C5364", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>+ Añadir</button>
          </div>
        ) : viewMode === "table" ? (
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "10px 8px", width: 30 }}></th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase" }}>Convocatoria</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase" }}>Organismo</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase" }}>Estado</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase" }}>Deadline</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase" }}>Días</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase" }}>Presupuesto</th>
                  <th style={{ padding: "10px 4px", width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((call) => (
                  <TableRow key={call.id} call={call} onEdit={openEdit} onToggleStar={toggleStar} onDiscard={discardCall} onRecover={recoverCall} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((call) => (
              <CallCard key={call.id} call={call} onEdit={openEdit} onToggleStar={toggleStar} onDelete={deleteCall} onDiscard={discardCall} onRecover={recoverCall} />
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={resetData} style={{ background: "none", border: "none", color: "#aaa", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
            Restaurar datos de ejemplo
          </button>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2 style={{ margin: "0 0 20px", fontSize: 20, fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>
            {editingCall ? "Editar convocatoria" : "Nueva convocatoria"}
          </h2>
          <InputField label="Título" value={form.title} onChange={updateForm("title")} placeholder="Ej: Doctorados Industriales 2026" required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Organismo" value={form.source} onChange={updateForm("source")} required options={SOURCES.map((s) => ({ value: s.id, label: s.label }))} />
            <InputField label="Estado" value={form.status} onChange={updateForm("status")} options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Fecha límite" value={form.deadline} onChange={updateForm("deadline")} type="date" />
            <InputField label="Presupuesto" value={form.budget} onChange={updateForm("budget")} placeholder="Ej: 50.000€" />
          </div>
          <InputField label="Elegibilidad" value={form.elegibility} onChange={updateForm("elegibility")} options={ELEGIBILITY} />
          <InputField label="URL convocatoria" value={form.url} onChange={updateForm("url")} placeholder="https://..." />
          <InputField label="URL bases oficiales" value={form.bases_url} onChange={updateForm("bases_url")} placeholder="https://... (enlace al BOE, BOCM, PDF de bases...)" />
          <InputField label="Notas" value={form.notes} onChange={updateForm("notes")} textarea placeholder="Requisitos, plazos..." />
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button onClick={saveCall} disabled={!form.title || !form.source} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: form.title && form.source ? "#2C5364" : "#ccc", color: "#fff", fontSize: 14, fontWeight: 600, cursor: form.title && form.source ? "pointer" : "default", fontFamily: "inherit" }}>
              {editingCall ? "Guardar cambios" : "Añadir convocatoria"}
            </button>
            <button onClick={() => setShowModal(false)} style={{ padding: "12px 20px", borderRadius: 10, border: "1.5px solid #ddd", background: "#fff", color: "#555", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          </div>
          {editingCall && editingCall.url && (
            <a href={editingCall.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: 12, color: "#2C5364" }}>
              🔗 Abrir web de la convocatoria
            </a>
          )}
        </Modal>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Modal onClose={() => setShowSettings(false)}>
          <h2 style={{ margin: "0 0 20px", fontSize: 20, fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>⚙️ Configuración</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 }}>
              GitHub Token (para sincronizar cambios)
            </label>
            <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>
              Introduce un Personal Access Token con permisos <code style={{ background: "#f0f0f0", padding: "1px 4px", borderRadius: 3 }}>repo</code> para que tus ediciones se guarden en GitHub y persistan entre dispositivos.
            </p>
            <input
              type="password"
              defaultValue={ghToken}
              id="gh-token-input"
              placeholder="ghp_..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, background: "#fafafa", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => saveGhToken(document.getElementById("gh-token-input").value.trim())}
              style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "#2C5364", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >Guardar</button>
            {ghToken && (
              <button onClick={() => saveGhToken("")} style={{ padding: "12px 20px", borderRadius: 10, border: "1.5px solid #ddd", background: "#fff", color: "#C41E3A", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                Desconectar
              </button>
            )}
            <button onClick={() => setShowSettings(false)} style={{ padding: "12px 20px", borderRadius: 10, border: "1.5px solid #ddd", background: "#fff", color: "#555", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          </div>
          {ghToken && <p style={{ fontSize: 11, color: "#1B813E", marginTop: 12, textAlign: "center" }}>✅ Token configurado — los cambios se sincronizan automáticamente con GitHub</p>}
        </Modal>
      )}
    </div>
  );
}
