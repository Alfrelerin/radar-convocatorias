#!/usr/bin/env python3
"""
=============================================================================
FUNDING CALL MONITOR - Neuron Rehabilitación
=============================================================================

Script de monitorización automática de convocatorias de I+D relevantes para
una clínica de neurorrehabilitación.

Funcionalidades:
  - Chequea RSS feeds de los principales organismos financiadores
  - Detecta nuevas convocatorias por palabras clave
  - Envía resumen diario/semanal por email
  - Registra historial para evitar duplicados

Instalación:
  pip install feedparser requests beautifulsoup4 schedule

Ejecución manual:
  python funding_monitor.py

Ejecución automática (cron, cada día a las 8:00):
  0 8 * * * /usr/bin/python3 /ruta/a/funding_monitor.py

Alternativa gratuita con GitHub Actions:
  Ver instrucciones al final del archivo.

=============================================================================
"""

import feedparser
import requests
from bs4 import BeautifulSoup
import smtplib
import json
import hashlib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from pathlib import Path
import logging
import os

# ─────────────────────────────────────────────────────
# CONFIGURACIÓN - Edita estos valores
# ─────────────────────────────────────────────────────

CONFIG = {
    # Email - Remitente (usa una cuenta de Gmail con App Password)
    # Tutorial: https://support.google.com/accounts/answer/185833
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "email_from": os.environ.get("EMAIL_FROM", ""),
    "email_password": os.environ.get("EMAIL_PASSWORD", ""),

    # Email - Destinatarios (separar múltiples con comas en variable de entorno)
    "email_to": [e.strip() for e in os.environ.get("EMAIL_TO", "").split(",") if e.strip()],

    # Fichero de historial (para no repetir alertas)
    "history_file": os.environ.get("HISTORY_FILE", "funding_history.json"),
}

# ─────────────────────────────────────────────────────
# FUENTES RSS
# ─────────────────────────────────────────────────────

RSS_FEEDS = [
    {
        "nombre": "CDTI - Ayudas",
        "url": "https://www.cdti.es/rss/ayudas",
        "tipo": "Nacional",
        "organismo": "CDTI",
    },
    {
        "nombre": "AEI - Convocatorias",
        "url": "https://www.aei.gob.es/rss/convocatorias",
        "tipo": "Nacional",
        "organismo": "AEI",
    },
    {
        "nombre": "CORDIS - Health",
        "url": "https://cordis.europa.eu/search/en?q=contenttype%3D%27project%27%20AND%20programme%2Fcode%3D%27HORIZON.1.1%27&format=rss",
        "tipo": "Europea",
        "organismo": "Horizon Europe",
    },
    {
        "nombre": "Euraxess - Spain Funding",
        "url": "https://euraxess.ec.europa.eu/feeds/funding/country/spain",
        "tipo": "Europea",
        "organismo": "Euraxess",
    },
    {
        "nombre": "ISCIII - Convocatorias",
        "url": "https://www.isciii.es/rss/convocatorias",
        "tipo": "Nacional",
        "organismo": "ISCIII",
    },
    {
        "nombre": "Comunidad de Madrid - Subvenciones",
        "url": "https://www.comunidad.madrid/gobierno/informacion-juridica-legislacion/rss",
        "tipo": "Nacional",
        "organismo": "Comunidad de Madrid",
    },
]

# ─────────────────────────────────────────────────────
# PÁGINAS WEB PARA SCRAPING (cuando no hay RSS)
# ─────────────────────────────────────────────────────

WEB_SOURCES = [
    {
        "nombre": "Fundación La Caixa - CaixaResearch",
        "url": "https://fundacionlacaixa.org/investigacion-y-becas/programas-investigacion/caixaresearch",
        "tipo": "Privada",
        "organismo": "Fundación La Caixa",
        "selector": "article, .card, .programa",
    },
    {
        "nombre": "Fundación BBVA - Convocatorias",
        "url": "https://www.fbbva.es/convocatorias/",
        "tipo": "Privada",
        "organismo": "Fundación BBVA",
        "selector": "article, .convocatoria, .card",
    },
    {
        "nombre": "Comunidad de Madrid - Doctorados Industriales",
        "url": "https://www.comunidad.madrid/servicios/educacion/doctorados-industriales",
        "tipo": "Nacional",
        "organismo": "Comunidad de Madrid",
        "selector": "article, .field-item, .convocatoria",
    },
    {
        "nombre": "Comunidad de Madrid - Convocatorias Investigación",
        "url": "https://www.comunidad.madrid/servicios/investigacion-cientifica-e-innovacion-tecnologica/convocatorias-ayudas-investigacion",
        "tipo": "Nacional",
        "organismo": "Comunidad de Madrid",
        "selector": "article, .views-row, .field-content, .card",
    },
]

# ─────────────────────────────────────────────────────
# PALABRAS CLAVE (ajusta según tu perfil)
# ─────────────────────────────────────────────────────

KEYWORDS_TEMATICOS = [
    "neurociencia", "neurología", "rehabilitación", "neurorrehabilitación",
    "fisioterapia", "espasticidad", "ictus", "stroke", "daño cerebral",
    "wearable", "robótica", "bioingeniería", "brain", "motor control",
    "neurorehabilitation", "spasticity", "brain injury", "physiotherapy",
    "tecnología asistiva", "assistive technology", "biomecánica",
    "electromiografía", "EMG", "estimulación", "stimulation",
]

KEYWORDS_TIPO_AYUDA = [
    "empresa", "clínica", "PYME", "industrial", "innovación",
    "I+D", "subvención", "ayuda", "convocatoria", "grant",
    "funding", "call", "doctorado", "colaboración", "consorcio",
    "transferencia", "aplicada",
]

# ─────────────────────────────────────────────────────
# LÓGICA PRINCIPAL
# ─────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("funding_monitor")


def load_history():
    path = Path(CONFIG["history_file"])
    if path.exists():
        try:
            data = json.loads(path.read_text())
            if "seen_ids" not in data:
                data["seen_ids"] = []
            return data
        except (json.JSONDecodeError, KeyError) as e:
            log.warning(f"Historial corrupto, reiniciando: {e}")
    return {"seen_ids": [], "last_check": None}


def save_history(history):
    history["last_check"] = datetime.now().isoformat()
    Path(CONFIG["history_file"]).write_text(
        json.dumps(history, indent=2, ensure_ascii=False)
    )


def generate_id(text):
    return hashlib.md5(text.encode()).hexdigest()[:12]


def is_relevant(title, summary=""):
    text = f"{title} {summary}".lower()
    has_tematico = any(kw.lower() in text for kw in KEYWORDS_TEMATICOS)
    has_tipo = any(kw.lower() in text for kw in KEYWORDS_TIPO_AYUDA)
    return has_tematico or has_tipo


def score_relevance(title, summary=""):
    text = f"{title} {summary}".lower()
    score = 0
    matches = []
    for kw in KEYWORDS_TEMATICOS:
        if kw.lower() in text:
            score += 10
            matches.append(kw)
    for kw in KEYWORDS_TIPO_AYUDA:
        if kw.lower() in text:
            score += 5
            matches.append(kw)
    return min(score, 100), matches


def check_rss_feeds():
    results = []
    for feed_config in RSS_FEEDS:
        log.info(f"Revisando RSS: {feed_config['nombre']}")
        try:
            feed = feedparser.parse(feed_config["url"])
            for entry in feed.entries[:20]:
                title = entry.get("title", "")
                summary = entry.get("summary", "")
                link = entry.get("link", "")
                if is_relevant(title, summary):
                    score, matches = score_relevance(title, summary)
                    results.append({
                        "titulo": title,
                        "resumen": summary[:300],
                        "url": link,
                        "fecha": entry.get("published", ""),
                        "organismo": feed_config["organismo"],
                        "tipo": feed_config["tipo"],
                        "fuente": feed_config["nombre"],
                        "score": score,
                        "keywords_encontrados": matches,
                        "id": generate_id(f"{title}{link}"),
                    })
        except Exception as e:
            log.warning(f"Error en feed {feed_config['nombre']}: {e}")
    return results


def check_web_sources():
    results = []
    headers = {"User-Agent": "Mozilla/5.0 (Funding Monitor; academic research)"}
    for source in WEB_SOURCES:
        log.info(f"Revisando web: {source['nombre']}")
        try:
            resp = requests.get(source["url"], headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for selector in source["selector"].split(","):
                elements = soup.select(selector.strip())
                for el in elements[:10]:
                    text = el.get_text(strip=True)
                    link_tag = el.find("a")
                    link = link_tag["href"] if link_tag and link_tag.get("href") else source["url"]
                    if not link.startswith("http"):
                        from urllib.parse import urljoin
                        link = urljoin(source["url"], link)
                    if is_relevant(text) and len(text) > 20:
                        score, matches = score_relevance(text)
                        results.append({
                            "titulo": text[:200],
                            "resumen": "",
                            "url": link,
                            "fecha": datetime.now().strftime("%Y-%m-%d"),
                            "organismo": source["organismo"],
                            "tipo": source["tipo"],
                            "fuente": source["nombre"],
                            "score": score,
                            "keywords_encontrados": matches,
                            "id": generate_id(text[:200]),
                        })
        except Exception as e:
            log.warning(f"Error en web {source['nombre']}: {e}")
    return results


def filter_new(results, history):
    new_results = []
    for r in results:
        if r["id"] not in history["seen_ids"]:
            new_results.append(r)
            history["seen_ids"].append(r["id"])
    if len(history["seen_ids"]) > 1000:
        history["seen_ids"] = history["seen_ids"][-1000:]
    return new_results


def build_email_html(new_results):
    new_results.sort(key=lambda x: x["score"], reverse=True)
    html = f"""
    <html><head><style>
        body {{ font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #0d4f3c, #1a7a5c); padding: 24px 28px; color: white; }}
        .header h1 {{ margin: 0; font-size: 20px; }}
        .header p {{ margin: 6px 0 0; opacity: 0.8; font-size: 13px; }}
        .body {{ padding: 24px 28px; }}
        .card {{ border: 1px solid #e8e8e8; border-radius: 8px; padding: 16px; margin-bottom: 14px; border-left: 4px solid #10b981; }}
        .card h3 {{ margin: 0 0 6px; font-size: 15px; }}
        .meta {{ font-size: 12px; color: #6b7280; margin-bottom: 8px; }}
        .kw {{ font-size: 10px; background: #f0fdf4; color: #166534; padding: 2px 8px; border-radius: 4px; display: inline-block; margin: 2px; }}
        .score {{ float: right; font-size: 12px; font-weight: 600; color: #10b981; }}
        .link {{ color: #0d9488; text-decoration: none; font-size: 12px; }}
        .footer {{ padding: 16px 28px; background: #f9fafb; font-size: 11px; color: #9ca3af; text-align: center; }}
    </style></head><body><div class="container">
        <div class="header">
            <h1>🔬 Neuron · Funding Monitor</h1>
            <p>{datetime.now().strftime('%d/%m/%Y')} — {len(new_results)} nueva(s) convocatoria(s)</p>
        </div><div class="body">"""

    for r in new_results:
        html += f"""<div class="card">
            <span class="score">Relevancia: {r['score']}%</span>
            <h3>{r['titulo'][:120]}</h3>
            <div class="meta">{r['organismo']} · {r['tipo']} · {r['fecha']}</div>
            {f"<p style='font-size:13px;color:#4b5563;'>{r['resumen'][:200]}</p>" if r['resumen'] else ""}
            <a class="link" href="{r['url']}">Ver convocatoria ↗</a><br>
            {''.join(f'<span class="kw">{kw}</span>' for kw in r['keywords_encontrados'][:6])}
        </div>"""

    html += """</div><div class="footer">
        Generado por Funding Monitor · Neuron Rehabilitación
    </div></div></body></html>"""
    return html


def send_email(html_content, num_results):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔬 Funding Monitor: {num_results} convocatoria(s) - {datetime.now().strftime('%d/%m/%Y')}"
        msg["From"] = CONFIG["email_from"]
        msg["To"] = ", ".join(CONFIG["email_to"])
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(CONFIG["smtp_server"], CONFIG["smtp_port"]) as server:
            server.starttls()
            server.login(CONFIG["email_from"], CONFIG["email_password"])
            server.send_message(msg)
        log.info(f"Email enviado a {CONFIG['email_to']}")
    except Exception as e:
        log.error(f"Error enviando email: {e}")
        raise


# ─────────────────────────────────────────────────────
# GENERACIÓN DE calls.json PARA EL DASHBOARD
# ─────────────────────────────────────────────────────

# Mapeo de organismo → source id del dashboard
ORGANISMO_TO_SOURCE = {
    "CDTI": "cdti",
    "AEI": "aei",
    "ISCIII": "isciii",
    "Horizon Europe": "horizon",
    "Euraxess": "horizon",
    "Comunidad de Madrid": "cm",
    "Fundación La Caixa": "fundacion",
    "Fundación BBVA": "fundacion",
}


def classify_by_date(fecha_str):
    """Clasifica el estado de una convocatoria según su fecha."""
    if not fecha_str:
        return "open"  # Sin fecha → abierta por defecto
    try:
        deadline = datetime.strptime(fecha_str[:10], "%Y-%m-%d")
        days = (deadline - datetime.now()).days
        if days < 0:
            return "closed"
        elif days > 30:
            return "upcoming"
        else:
            return "open"  # ≤30 días, urgente se calcula en el dashboard
    except (ValueError, TypeError):
        return "open"


def convert_to_dashboard_format(result):
    """Convierte un resultado del monitor al formato del dashboard."""
    fecha = result.get("fecha", "")
    return {
        "id": f"auto_{result['id']}",
        "title": result["titulo"][:200],
        "source": ORGANISMO_TO_SOURCE.get(result["organismo"], "otra"),
        "url": result["url"],
        "deadline": fecha,
        "status": classify_by_date(fecha),
        "elegibility": "",
        "budget": "",
        "notes": f"[Auto-detectada] Organismo: {result['organismo']} · Tipo: {result['tipo']} · "
                 f"Relevancia: {result['score']}% · Keywords: {', '.join(result['keywords_encontrados'][:5])}. "
                 f"{result.get('resumen', '')[:150]}",
        "starred": False,
        "auto_detected": True,
        "detected_date": datetime.now().strftime("%Y-%m-%d"),
    }


def generate_calls_json(all_results, output_path="public/calls.json"):
    """
    Genera/actualiza calls.json combinando convocatorias manuales existentes
    con las auto-detectadas por el monitor.
    """
    output = Path(output_path)

    # Cargar calls.json existente (con convocatorias manuales)
    existing_calls = []
    if output.exists():
        try:
            data = json.loads(output.read_text())
            existing_calls = data.get("calls", [])
        except (json.JSONDecodeError, KeyError):
            log.warning("calls.json corrupto, se regenerará")

    # Separar manuales de auto-detectadas anteriores
    manual_calls = [c for c in existing_calls if not c.get("auto_detected", False)]
    old_auto_ids = {c["id"] for c in existing_calls if c.get("auto_detected", False)}

    # Convertir nuevos resultados
    new_auto_calls = []
    for r in all_results:
        call = convert_to_dashboard_format(r)
        if call["id"] not in old_auto_ids:
            new_auto_calls.append(call)

    # Mantener auto-detectadas anteriores (reclasificar por fecha) + añadir nuevas
    auto_calls = []
    for c in existing_calls:
        if c.get("auto_detected", False):
            # Reclasificar excepto descartadas (el usuario las descartó manualmente)
            if c.get("status") != "descartada":
                c["status"] = classify_by_date(c.get("deadline", ""))
            auto_calls.append(c)
    auto_calls.extend(new_auto_calls)

    # Limitar auto-detectadas a las últimas 50
    auto_calls = auto_calls[-50:]

    # Combinar todo
    all_calls = manual_calls + auto_calls

    calls_data = {
        "last_updated": datetime.now().isoformat(),
        "total": len(all_calls),
        "manual_count": len(manual_calls),
        "auto_count": len(auto_calls),
        "new_this_run": len(new_auto_calls),
        "calls": all_calls,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(calls_data, indent=2, ensure_ascii=False))
    log.info(f"calls.json actualizado: {len(manual_calls)} manuales + {len(auto_calls)} auto ({len(new_auto_calls)} nuevas)")
    return calls_data


def validate_config():
    """Valida que las credenciales de email estén configuradas."""
    missing = []
    if not CONFIG["email_from"]:
        missing.append("EMAIL_FROM")
    if not CONFIG["email_password"]:
        missing.append("EMAIL_PASSWORD")
    if not CONFIG["email_to"]:
        missing.append("EMAIL_TO")
    if missing:
        log.error(
            f"Faltan variables de entorno: {', '.join(missing)}. "
            "Configúralas antes de ejecutar el script.\n"
            "  export EMAIL_FROM='tu.email@gmail.com'\n"
            "  export EMAIL_PASSWORD='tu-app-password'\n"
            "  export EMAIL_TO='destinatario@email.com'"
        )
        return False
    return True


def deduplicate_results(results):
    """Elimina resultados duplicados dentro de una misma ejecución."""
    seen_titles = set()
    unique = []
    for r in results:
        title_key = r["titulo"].lower().strip()[:80]
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique.append(r)
    return unique


def main():
    log.info("=" * 50)
    log.info("FUNDING MONITOR - Inicio de chequeo")
    log.info("=" * 50)

    # Ruta al calls.json (se puede configurar por env var)
    calls_json_path = os.environ.get("CALLS_JSON_PATH", "public/calls.json")

    history = load_history()
    log.info(f"Historial: {len(history['seen_ids'])} ya vistas | Último: {history.get('last_check', 'Nunca')}")

    # Buscar convocatorias
    all_results = []
    all_results.extend(check_rss_feeds())
    all_results.extend(check_web_sources())
    log.info(f"Resultados relevantes (brutos): {len(all_results)}")

    all_results = deduplicate_results(all_results)
    log.info(f"Resultados tras deduplicar: {len(all_results)}")

    new_results = filter_new(all_results, history)
    log.info(f"Convocatorias NUEVAS: {len(new_results)}")

    save_history(history)

    # Siempre actualizar calls.json con TODOS los resultados relevantes
    # (no solo los nuevos, para que el dashboard tenga el catálogo completo)
    generate_calls_json(all_results, output_path=calls_json_path)

    # Enviar email solo si hay novedades Y las credenciales están configuradas
    if new_results and validate_config():
        html = build_email_html(new_results)
        send_email(html, len(new_results))
    elif new_results:
        log.info(f"Hay {len(new_results)} nuevas, pero email no configurado. Solo se actualiza calls.json.")
    else:
        log.info("Sin novedades.")

    log.info("Chequeo completado.")
    return new_results


if __name__ == "__main__":
    main()


# =============================================================================
# INSTRUCCIONES PARA GITHUB ACTIONS (ejecución automática gratuita)
# =============================================================================
#
# 1. Crea un repositorio PRIVADO en GitHub
# 2. Sube este archivo (funding_monitor.py) y un funding_history.json con: {}
# 3. Crea el archivo .github/workflows/funding_check.yml con:
#
# name: Funding Monitor
# on:
#   schedule:
#     - cron: '0 7 * * 1-5'    # L-V a las 9:00 hora Madrid
#   workflow_dispatch:           # Permite ejecución manual
#
# jobs:
#   check:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v4
#       - uses: actions/setup-python@v5
#         with:
#           python-version: '3.11'
#       - run: pip install feedparser requests beautifulsoup4
#       - env:
#           EMAIL_FROM: ${{ secrets.EMAIL_FROM }}
#           EMAIL_PASSWORD: ${{ secrets.EMAIL_PASSWORD }}
#         run: python funding_monitor.py
#       - run: |
#           git config user.name "Funding Bot"
#           git config user.email "bot@neuron.com"
#           git add funding_history.json
#           git diff --staged --quiet || git commit -m "Update history"
#           git push
#
# 4. En Settings > Secrets > Actions, añade EMAIL_FROM y EMAIL_PASSWORD
# 5. ¡Listo! Se ejecuta solo de lunes a viernes.
# =============================================================================
