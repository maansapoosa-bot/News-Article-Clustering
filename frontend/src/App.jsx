import { useEffect, useState } from "react";
import axios from "axios";

import { Search, X, ChevronLeft, ChevronRight, ArrowRight, Loader2 } from "lucide-react";

const COLORS = ['#2e4057', '#b5862a', '#4a7c8e', '#1c2b3a', '#7a5c2e', '#3d6b5c', '#6b3a4a'];
const ACCENT = "#b5862a"; // gold
// Backend API URL - points to Render deployment v2
const API_BASE = "https://news-article-clustering-1.onrender.com";

// Keep Render backend alive by pinging it every 14 minutes
setInterval(() => {
  fetch(`${API_BASE}/cluster-info`).catch(() => {});
}, 14 * 60 * 1000);

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return "";
  try { return new Date(str).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return str.slice(0, 10); }
}

// ── Article Modal ──────────────────────────────────────────────────────────
function ArticleModal({ article, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="modal-flag">{article.cluster}</div>
        <h2 className="modal-title">{article.Headline || "Untitled"}</h2>
        <div className="modal-byline">
          {article.Author && <span>By {article.Author}</span>}
          {article["Date published"] && <span>{fmtDate(article["Date published"])}</span>}
          {article.Category && <span>{article.Category}</span>}
        </div>
        <div className="modal-rule" />
        {article.Description && <p className="modal-description">{article.Description}</p>}
        {article.Url && (
          <a href={article.Url} target="_blank" rel="noopener noreferrer" className="modal-link">
            Continue Reading <ArrowRight size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [clusterInfo, setClusterInfo] = useState({ counts: {}, keywords: {}, categories: {}, authors: [], stats: {} });
  const [articles, setArticles]       = useState([]);
  const [pagination, setPagination]   = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]         = useState(true);
  const [infoError, setInfoError]     = useState(false);

  const [selectedCluster, setSelectedCluster] = useState("all");
  const [inputValue, setInputValue]   = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage]               = useState(1);
  const [modal, setModal]             = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/cluster-info`, { timeout: 60000 })
      .then(r => { setClusterInfo(r.data); setInfoError(false); })
      .catch(() => setInfoError(true));
  }, []);

  // reset to page 1 whenever filters change (but not when page itself changes)
  useEffect(() => { setPage(1); }, [selectedCluster, searchQuery]);

  // fetch whenever page or filters change
  useEffect(() => {
    if (!clusterInfo.clusterIds) return;
    setLoading(true);
    const idMap = clusterInfo.clusterIds || {};
    const cid = selectedCluster === "all" ? "all" : (idMap[selectedCluster] ?? selectedCluster);
    axios.get(`${API_BASE}/data`, { params: { cluster: cid, q: searchQuery, page, per_page: 12 }, timeout: 60000 })
      .then(r => {
        setArticles(r.data.articles || []);
        setPagination({ total: r.data.total, page: r.data.page, pages: r.data.pages });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clusterInfo.clusterIds, selectedCluster, searchQuery, page]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(inputValue), 350);
    return () => clearTimeout(t);
  }, [inputValue]);

  const stats = clusterInfo.stats || {};
  const authors = clusterInfo.authors || [];
  const clusterKeys = Object.keys(clusterInfo.counts || {});

  // split articles into layout zones
  const featured = articles[0];
  const secondary = articles.slice(1, 3);
  const rest = articles.slice(3);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const hasLeftCol = selectedCluster !== "all" && clusterInfo.keywords?.[selectedCluster];

  return (
    <div className="np-page">

      {/* ══ MASTHEAD ══ */}
      <header className="np-masthead">
        <div className="np-masthead-top">
          <div className="np-masthead-meta">
            <span>{today}</span>
            <span>{stats.total ? stats.total.toLocaleString() + " Articles" : ""}</span>
          </div>
          <div className="np-masthead-title-wrap">
            <div className="np-masthead-rule" />
            <h1 className="np-masthead-title">The News Analyst</h1>
            <div className="np-masthead-subtitle">Clustering · Insights · Discovery</div>
            <div className="np-masthead-rule" />
          </div>
          <div className="np-masthead-meta np-masthead-meta-right">
            {stats.dateMin && <span>{stats.dateMin} – {stats.dateMax}</span>}
            <span>{stats.avgPerDay} avg/day</span>
          </div>
        </div>

        {/* Ticker — cluster counts */}
        <div className="np-ticker">
          {clusterKeys.map((k, i) => (
            <button key={k}
              className={`np-ticker-item ${selectedCluster === k ? "active" : ""}`}
              onClick={() => setSelectedCluster(selectedCluster === k ? "all" : k)}
              style={{ "--tk-color": COLORS[i % COLORS.length] }}>
              {k}
              <span className="np-ticker-count">{(clusterInfo.counts[k] || 0).toLocaleString()}</span>
            </button>
          ))}
        </div>

        {/* Nav bar */}
        <nav className="np-nav">
          <button className={`np-nav-item ${selectedCluster === "all" ? "active" : ""}`} onClick={() => setSelectedCluster("all")}>All</button>
          {clusterKeys.map(k => (
            <button key={k} className={`np-nav-item ${selectedCluster === k ? "active" : ""}`} onClick={() => setSelectedCluster(k)}>
              {k.split(" ")[0]}
            </button>
          ))}
          <div className="np-nav-search">
            <Search size={13} />
            <input placeholder="Search…" value={inputValue} onChange={e => setInputValue(e.target.value)} className="np-search-input" />
            {inputValue && <button className="np-search-clear" onClick={() => { setInputValue(""); setSearchQuery(""); }}><X size={11} /></button>}
          </div>
        </nav>
      </header>

      {/* ══ MAIN CONTENT ══ */}
      <main className={`np-main${hasLeftCol ? " has-left" : ""}`}>

        {/* ── Left column: keywords (only when cluster selected) ── */}
        {hasLeftCol && (
          <aside className="np-col-left">
            <div className="np-section-label">Key Terms</div>
            <div className="np-rule" />
            <div className="np-keywords">
              {clusterInfo.keywords[selectedCluster].map((kw, i) => (
                <span key={i} className="np-kw">{kw}</span>
              ))}
            </div>
          </aside>
        )}

        {/* ── Centre column: articles ── */}
        <section className="np-col-centre">
          {loading ? (
            <div className="np-loading" style={{ height: 300 }}><Loader2 className="spin" size={36} /></div>
          ) : (
            <>
              {/* Featured story */}
              {featured && (
                <article className="np-featured" onClick={() => setModal(featured)}>
                  <div className="np-flag">{featured.cluster}</div>
                  <h2 className="np-featured-headline">{featured.Headline}</h2>
                  {featured.Description && <p className="np-featured-desc">{featured.Description.slice(0, 180)}{featured.Description.length > 180 ? "…" : ""}</p>}
                  <div className="np-byline">
                    {featured.Author && <span>By {featured.Author.split(",")[0]}</span>}
                    {featured["Date published"] && <span>{fmtDate(featured["Date published"])}</span>}
                  </div>
                </article>
              )}

              <div className="np-col-rule-h" />

              {/* Secondary stories row */}
              <div className="np-secondary-row">
                {secondary.map((a, i) => (
                  <article key={i} className="np-secondary" onClick={() => setModal(a)}>
                    <div className="np-flag np-flag-sm">{a.cluster}</div>
                    <h3 className="np-secondary-headline">{a.Headline}</h3>
                    {a.Description && <p className="np-secondary-desc">{a.Description.slice(0, 100)}…</p>}
                    <div className="np-byline">{a.Author && <span>By {a.Author.split(",")[0]}</span>}</div>
                  </article>
                ))}
              </div>

              <div className="np-col-rule-h" />

              {/* Rest grid */}
              <div className="np-rest-grid">
                {rest.map((a, i) => (
                  <article key={i} className="np-rest-item" onClick={() => setModal(a)}>
                    <h4 className="np-rest-headline">{a.Headline}</h4>
                    <div className="np-byline">
                      {a.Category && <span>{a.Category}</span>}
                      {a["Date published"] && <span>{fmtDate(a["Date published"])}</span>}
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="np-pagination">
                  <button className="np-page-btn" disabled={page <= 1} onClick={() => setPage(1)}>
                    «
                  </button>
                  <button className="np-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={14} /> Prev
                  </button>
                  {(() => {
                    const total = pagination.pages;
                    const current = page;
                    const delta = 2;
                    const pages = [];
                    const left = Math.max(2, current - delta);
                    const right = Math.min(total - 1, current + delta);
                    pages.push(1);
                    if (left > 2) pages.push("...");
                    for (let i = left; i <= right; i++) pages.push(i);
                    if (right < total - 1) pages.push("...");
                    if (total > 1) pages.push(total);
                    return pages.map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="np-page-ellipsis">…</span>
                      ) : (
                        <button
                          key={p}
                          className={`np-page-num ${p === current ? "active" : ""}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}
                  <button className="np-page-btn" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
                    Next <ChevronRight size={14} />
                  </button>
                  <button className="np-page-btn" disabled={page >= pagination.pages} onClick={() => setPage(pagination.pages)}>
                    »
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Right column: authors + stats ── */}
        <aside className="np-col-right">
          <div className="np-section-label">Top Authors</div>
          <div className="np-rule" />
          {authors.slice(0, 8).map((a, i) => (
            <div key={i} className="np-author-row">
              <span className="np-author-num">{i + 1}</span>
              <div className="np-author-info">
                <div className="np-author-name">{a.author}</div>
                <div className="np-author-bar-wrap">
                  <div className="np-author-bar" style={{ width: `${Math.round((a.count / authors[0].count) * 100)}%` }} />
                </div>
              </div>
              <span className="np-author-count">{a.count}</span>
            </div>
          ))}

          {pagination.total > 0 && (
            <>
              <div className="np-rule" style={{ marginTop: "1.5rem" }} />
              <div className="np-section-label">Results</div>
              <div className="np-rule" />
              <p className="np-results-text">
                {pagination.total.toLocaleString()} article{pagination.total !== 1 ? "s" : ""} match your selection.
              </p>
            </>
          )}
        </aside>
      </main>

      {/* ══ FOOTER ══ */}
      <footer className="np-footer">
        <div className="np-rule" />
        <p>The News Analyst · {stats.dateMin} – {stats.dateMax} · {(stats.total || 0).toLocaleString()} articles indexed</p>
      </footer>

      {modal && <ArticleModal article={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
