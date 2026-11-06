(function () {
  "use strict";
  const C = window.REVIEW_CONFIG;
  const app = document.getElementById("app");
  document.getElementById("siteTitle").textContent = C.title + " – Results";
  const MAX = C.maxStars;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const f1 = n => n.toFixed(1);
  const reviewAvg = r => avg(C.criteria.map(c => r.ratings[c.key] || 0));

  function aggregate(votes) {
    return C.designs.map(d => {
      const reviews = votes.map(v => v.reviews && v.reviews[d.id]).filter(Boolean);
      const perCrit = {};
      C.criteria.forEach(c => { perCrit[c.key] = avg(reviews.map(r => r.ratings[c.key] || 0)); });
      return {
        d, votes: votes.filter(v => v.vote === d.id).length, reviewCount: reviews.length,
        perCrit, overall: reviews.length ? avg(reviews.map(reviewAvg)) : 0
      };
    });
  }

  // winner: most votes; tie -> higher average rating
  function pickWinner(aggs) {
    const sorted = aggs.slice().sort((a, b) => b.votes - a.votes || b.overall - a.overall);
    const w = sorted[0];
    const tied = sorted.filter(x => x.votes === w.votes && x.overall === w.overall);
    return { w, tied: tied.length > 1, tieOnVotes: sorted.filter(x => x.votes === w.votes).length > 1 };
  }

  function stars(n) { return "★".repeat(Math.round(n)) + "☆".repeat(MAX - Math.round(n)); }

  function render(votes) {
    app.innerHTML = "";
    if (!votes.length) {
      app.append(el("div", "card empty", "No votes yet. Be the first to vote!"));
      const a = el("a", "btn", "Go to voting"); a.href = "index.html"; a.style.marginTop = "14px"; app.firstChild.append(document.createElement("br"), a);
      return;
    }
    const aggs = aggregate(votes);
    const { w, tied, tieOnVotes } = pickWinner(aggs);

    // winner banner
    const wb = el("div", "winner");
    wb.append(el("div", "crown", tied ? "🤝" : "🏆"));
    const wt = el("div");
    if (tied) {
      wt.append(el("h2", null, "It's a tie!"));
      wt.append(el("div", "muted", "Same votes and same average rating – more votes needed."));
    } else {
      wt.append(el("h2", null, w.d.name + " is leading"));
      wt.append(el("div", "muted", w.votes + " of " + votes.length + " vote" + (votes.length > 1 ? "s" : "") +
        " · average rating " + f1(w.overall) + " / " + MAX + (tieOnVotes ? " (won the tie-break on rating)" : "")));
    }
    wb.append(wt); app.append(wb);

    // aggregate cards
    const grid = el("div", "agg-grid");
    aggs.slice().sort((a, b) => b.votes - a.votes || b.overall - a.overall).forEach(a => {
      const card = el("div", "card agg" + (!tied && a === w ? " win" : ""));
      if (!tied && a === w) card.append(el("span", "badge", "WINNER"));
      card.append(el("h3", null, a.d.name));
      const row = el("div", "stat-row");
      [[a.votes, "votes"], [a.reviewCount ? f1(a.overall) : "–", "avg rating /" + MAX], [a.reviewCount, "reviews"]].forEach(([v, l]) => {
        const s = el("div", "stat"); s.append(el("b", null, String(v)), el("span", null, l)); row.append(s);
      });
      card.append(row);
      C.criteria.forEach(c => {
        const r = el("div", "bar-row");
        const bar = el("div", "bar"), i = document.createElement("i");
        i.style.width = (a.perCrit[c.key] / MAX * 100) + "%"; bar.append(i);
        r.append(el("span", null, c.label), bar, el("span", null, a.reviewCount ? f1(a.perCrit[c.key]) : "–"));
        card.append(r);
      });
      const link = el("a", null, "Open design ↗"); link.href = a.d.file; link.target = "_blank"; link.rel = "noopener";
      link.style.fontSize = "13px"; card.append(link);
      grid.append(card);
    });
    app.append(grid);

    // per-user table
    const h = el("h2", "section"); h.append(el("span", null, "Responses by user (" + votes.length + ")"));
    const dl = el("a", "btn ghost", "Download JSON"); app.append(h);

    const wrap = el("div", "table-wrap"), t = document.createElement("table");
    const hr = document.createElement("tr");
    ["User", "Voted for"].concat(C.designs.map(d => d.name + " ratings"), ["Needs attention / comments", "Submitted"])
      .forEach(x => hr.append(el("th", null, x)));
    const thead = document.createElement("thead"); thead.append(hr); t.append(thead);
    const tb = document.createElement("tbody");
    votes.slice().reverse().forEach(v => {
      const tr = document.createElement("tr");
      const u = el("td"); u.append(el("b", null, v.name), document.createElement("br"), el("span", "muted", v.email)); tr.append(u);
      const vt = el("td"); vt.append(el("span", "pill", C.designs.find(d => d.id === v.vote)?.name || v.vote)); tr.append(vt);
      C.designs.forEach(d => {
        const td = el("td", "rt"), r = v.reviews && v.reviews[d.id];
        if (!r) { td.append(el("span", "muted", "—")); }
        else {
          td.append(el("div", null, stars(reviewAvg(r)) + " " + f1(reviewAvg(r))));
          const sm = el("small", null, C.criteria.map(c => c.label.split(" ")[0] + " " + (r.ratings[c.key] || 0)).join(" · "));
          td.append(sm);
        }
        tr.append(td);
      });
      const cm = el("td", "comments");
      C.designs.forEach(d => {
        const r = v.reviews && v.reviews[d.id]; if (!r) return;
        if (r.needsAttention) { const p = el("div"); p.append(el("em", null, d.id + " needs: "), document.createTextNode(r.needsAttention)); cm.append(p); }
        if (r.liked) { const p = el("div"); p.append(el("em", null, d.id + " liked: "), document.createTextNode(r.liked)); cm.append(p); }
      });
      tr.append(cm);
      tr.append(el("td", "muted", new Date(v.submittedAt).toLocaleString()));
      tb.append(tr);
    });
    t.append(tb); wrap.append(t); app.append(wrap);
  }

  const STORE = "nnd_review_votes_v1";
  let base = [], imported = [], note = "";

  function merged() {                       // one vote per email, newest wins
    let local = []; try { local = JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) {}
    const map = new Map();
    base.concat(local, imported).forEach(v => {
      if (!v || !v.email || !v.reviews) return;
      const k = String(v.email).toLowerCase(), old = map.get(k);
      if (!old || String(v.submittedAt) >= String(old.submittedAt)) map.set(k, v);
    });
    return Array.from(map.values()).sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)));
  }

  function toolbar() {
    const bar = el("div", "card"); bar.style.cssText = "margin-bottom:18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap";
    const imp = el("label", "btn ghost", "Import vote files (.json)"); imp.style.cursor = "pointer";
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json"; inp.multiple = true; inp.hidden = true;
    inp.addEventListener("change", async () => {
      for (const f of inp.files) {
        try { const j = JSON.parse(await f.text()); imported = imported.concat(Array.isArray(j) ? j : [j]); } catch (e) {}
      }
      refresh();
    });
    imp.append(inp);
    const exp = el("button", "btn", "Download merged votes.json");
    exp.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(merged(), null, 2)], { type: "application/json" }));
      a.download = "votes.json"; a.click();
    });
    bar.append(imp, exp, el("span", "muted", note || "Replace data/votes.json with the merged file to publish the combined results."));
    return bar;
  }

  function refresh() { const v = merged(); render(v); app.prepend(toolbar()); }

  fetch("data/votes.json", { cache: "no-store" }).then(r => r.json()).then(j => { base = Array.isArray(j) ? j : []; })
    .catch(() => { note = "Could not read data/votes.json (normal when opened from disk). Use Import."; })
    .then(refresh);
})();
