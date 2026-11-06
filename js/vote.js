(function () {
  "use strict";
  const C = window.REVIEW_CONFIG;
  const $ = s => document.querySelector(s);
  const STORE = "nnd_review_votes_v1";
  let lastRecord = null;
  const DEV_W = { desktop: 1440, tablet: 820, mobile: 390 };
  const LBL = ["", "Poor", "Weak", "OK", "Good", "Excellent"];

  document.title = C.title;
  $("#siteTitle").textContent = C.title;

  // state: per design ratings, comments; chosen favourite
  const S = { name: "", email: "", cur: C.designs[0].id, device: "desktop", vote: "", ratings: {}, needs: {}, liked: {} };
  C.designs.forEach(d => { S.ratings[d.id] = {}; S.needs[d.id] = ""; S.liked[d.id] = ""; });

  const show = id => ["intro", "review", "done"].forEach(s => $("#" + s).classList.toggle("hidden", s !== id));
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const design = id => C.designs.find(d => d.id === id);
  const fullyRated = id => C.criteria.every(c => S.ratings[id][c.key] >= 1);
  const anyRated = id => C.criteria.some(c => S.ratings[id][c.key] >= 1);

  // ---------- intro ----------
  $("#startBtn").addEventListener("click", () => {
    const name = $("#name").value.trim(), email = $("#email").value.trim().toLowerCase();
    if (name.length < 2) return ($("#introError").textContent = "Please enter your name.");
    if (!isEmail(email)) return ($("#introError").textContent = "Please enter a valid email address.");
    S.name = name; S.email = email; $("#introError").textContent = "";
    show("review"); renderAll();
  });

  // ---------- preview ----------
  const frame = $("#frame"), stage = $("#stage");
  function layoutFrame() {
    const W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return;
    const dw = DEV_W[S.device], scale = Math.min(1, W / dw);
    frame.style.width = dw + "px";
    frame.style.height = (H / scale) + "px";
    frame.style.transform = "scale(" + scale + ")";
    frame.style.left = Math.max(0, (W - dw * scale) / 2) + "px";
  }
  window.addEventListener("resize", layoutFrame);
  document.querySelectorAll("#devSeg button").forEach(b => b.addEventListener("click", () => {
    S.device = b.dataset.dev;
    document.querySelectorAll("#devSeg button").forEach(x => x.classList.toggle("on", x === b));
    layoutFrame();
  }));

  // ---------- render ----------
  function renderTabs() {
    const t = $("#tabs"); t.innerHTML = "";
    C.designs.forEach(d => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tab" + (d.id === S.cur ? " on" : "");
      b.textContent = d.name;
      if (fullyRated(d.id)) { const k = document.createElement("span"); k.className = "tick"; k.textContent = "✓"; b.append(k); }
      if (S.vote === d.id) { const k = document.createElement("span"); k.textContent = " 🗳"; b.append(k); }
      b.addEventListener("click", () => { S.cur = d.id; renderAll(); });
      t.append(b);
    });
  }

  function renderPanel() {
    const id = S.cur, d = design(id);
    $("#stageTitle").textContent = d.name;
    $("#rateTitle").textContent = "Rate " + d.name;
    $("#openFull").href = d.file;
    if (frame.getAttribute("src") !== d.file) frame.setAttribute("src", d.file);
    layoutFrame();

    const list = $("#critList"); list.innerHTML = "";
    C.criteria.forEach(c => {
      const box = document.createElement("div"); box.className = "crit";
      box.innerHTML = '<div class="t"></div><div class="h"></div>';
      box.querySelector(".t").textContent = c.label;
      box.querySelector(".h").textContent = c.hint;
      const stars = document.createElement("div"); stars.className = "stars";
      const lbl = document.createElement("span"); lbl.className = "lbl";
      const paint = () => {
        const v = S.ratings[id][c.key] || 0;
        stars.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i < v));
        lbl.textContent = LBL[v] || "";
      };
      for (let i = 1; i <= C.maxStars; i++) {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = "★"; b.setAttribute("aria-label", i + " star" + (i > 1 ? "s" : ""));
        b.addEventListener("click", () => { S.ratings[id][c.key] = i; paint(); renderTabs(); });
        stars.append(b);
      }
      stars.append(lbl); paint(); box.append(stars); list.append(box);
    });

    $("#needs").value = S.needs[id]; $("#liked").value = S.liked[id];
    $("#voteLabel").textContent = "Vote for " + d.name + " as my favourite";
    $("#voteRadio").checked = S.vote === id;
    $("#voteBox").classList.toggle("picked", S.vote === id);
  }
  function renderAll() { renderTabs(); renderPanel(); }

  $("#needs").addEventListener("input", e => { S.needs[S.cur] = e.target.value; });
  $("#liked").addEventListener("input", e => { S.liked[S.cur] = e.target.value; });
  $("#voteRadio").addEventListener("change", () => { S.vote = S.cur; renderAll(); });

  // ---------- submit ----------
  function downloadVote() {
    if (!lastRecord) return;
    const blob = new Blob([JSON.stringify(lastRecord, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vote-" + lastRecord.email.replace(/[^a-z0-9]+/g, "_") + ".json";
    document.body.append(a); a.click(); a.remove();
  }
  $("#redownload").addEventListener("click", downloadVote);
  $("#submitBtn").addEventListener("click", async () => {
    const msg = $("#submitMsg"); msg.textContent = "";
    if (!S.vote) return (msg.textContent = "Pick your favourite design (use the vote box on the right).");
    if (!fullyRated(S.vote)) { S.cur = S.vote; renderAll(); return (msg.textContent = "Please give stars on all points for " + design(S.vote).name + "."); }
    for (const d of C.designs) {
      if (anyRated(d.id) && !fullyRated(d.id)) { S.cur = d.id; renderAll(); return (msg.textContent = "Finish all star ratings for " + d.name + " (or clear it by reloading)."); }
    }
    const reviews = {};
    C.designs.forEach(d => {
      if (fullyRated(d.id)) reviews[d.id] = { ratings: S.ratings[d.id], needsAttention: S.needs[d.id].trim(), liked: S.liked[d.id].trim() };
    });
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      submittedAt: new Date().toISOString(),
      name: S.name, email: S.email, vote: S.vote, reviews
    };
    let list = [];
    try { list = JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) {}
    if (list.some(v => v.email === S.email)) return (msg.textContent = "This email has already voted in this browser.");
    list.push(record);
    try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) {}
    lastRecord = record;
    downloadVote();
    show("done"); window.scrollTo(0, 0);
  });
})();
