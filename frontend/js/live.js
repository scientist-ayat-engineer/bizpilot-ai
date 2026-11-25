/* Live mode: Firebase login + FastAPI backend. Does nothing unless js/config.js is filled in. */
(function () {
  var C = window.BP_CONFIG || {};
  if (!C.apiBase || !C.firebase || !window.firebase || !window.BP || !window.BizAPI) return;

  var B = window.BP, API = window.BizAPI, L = (window.BPLive = { used: null });
  var $ = function (s) { return document.querySelector(s); };
  var NAMES = ["Business Manager", "Data Analyst", "Executive Agent"];
  var running = false;

  firebase.initializeApp(C.firebase);
  var auth = firebase.auth();
  window.bpGetToken = function () { var u = auth.currentUser; return u ? u.getIdToken() : Promise.resolve(""); };

  $("#demo").classList.add("hide");
  $("#signup").classList.remove("hide");

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function par(t) {
    return esc(t).split("\n").map(function (l) {
      l = l.replace(/^#+\s*/, "").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
      return l.trim() ? "<p>" + l + "</p>" : "";
    }).join("");
  }
  function reportHtml(r) {
    var f = r.facts || {}, d = new Date(r.created).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    var h = "<h2>Executive business report</h2><p class='sub'>Prepared by BizPilot AI on " + d + "</p>";
    (r.messages || []).forEach(function (m) { h += "<h3>" + esc(m.agent) + "</h3>" + par(m.content); });
    h += "<h3>Key figures</h3><table><tr><th>Measure</th><th>Value</th></tr>" +
      "<tr><td>Total sales</td><td>" + B.fmt(f.total_sales || 0) + "</td></tr>" +
      "<tr><td>Total expenses</td><td>" + B.fmt(f.total_expenses || 0) + "</td></tr>" +
      "<tr><td>Net profit</td><td>" + B.fmt(f.net_profit || 0) + "</td></tr>" +
      "<tr><td>Profit margin</td><td>" + (f.margin_pct || 0) + "%</td></tr></table>";
    (r.anomalies || []).forEach(function (a) { h += "<p><b>Possible data error:</b> " + esc(a.month) + " expenses of " + B.fmt(a.value) + " look unusually high.</p>"; });
    return h;
  }

  async function refresh() {
    var me = await API.me();
    B.set("bp_plan", me.plan);
    L.used = me.reports_used;
    $("#adminlink").classList.toggle("hide", !me.is_admin);
    var pays = await API.myPayments();
    var pend = pays.filter(function (p) { return p.status === "pending"; })[0];
    B.set("bp_pay", pend ? JSON.stringify({ plan: pend.plan, method: pend.method, tid: pend.tid, status: "pending" }) : "null");
    var reps = await API.reports();
    B.set("bp_hist", JSON.stringify(reps.map(function (r) {
      return { id: Date.parse(r.created), date: new Date(r.created).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), title: r.title, html: reportHtml(r) };
    })));
    if (reps.length) $("#rep").innerHTML = reportHtml(reps[0]);
    B.renderHist(); B.updChip();
  }

  function authError(e) {
    var c = e && e.code || "";
    if (/user-not-found|wrong-password|invalid-credential/.test(c)) return "Wrong email or password. New here? Press Create account.";
    if (c === "auth/email-already-in-use") return "This email already has an account. Press Sign in.";
    if (c === "auth/weak-password") return "Choose a password with at least 6 characters.";
    if (c === "auth/invalid-email") return "Please enter a valid email address.";
    return "Could not sign in. Please try again.";
  }
  L.login = function (email, pw) { auth.signInWithEmailAndPassword(email, pw).catch(function (e) { B.toast(authError(e)); }); };
  $("#signup").onclick = function () {
    var em = $("#em").value, pw = $("#pw").value;
    if (!em || !pw) { B.toast("Enter your email and a password first."); return; }
    auth.createUserWithEmailAndPassword(em, pw).catch(function (e) { B.toast(authError(e)); });
  };
  L.logout = function () { auth.signOut(); };

  auth.onAuthStateChanged(async function (u) {
    if (u) {
      B.set("bp_user", u.email || "user");
      try { await refresh(); } catch (e) { B.toast("Could not reach the server: " + e.message); }
      if (!location.hash || location.hash === "#login" || location.hash === "#home") location.hash = "#dashboard";
    } else { B.set("bp_user", ""); }
    B.route();
  });

  L.run = async function () {
    if (running) return;
    running = true;
    location.hash = "#agents";
    var chat = $("#chat"), nodes = [0, 1, 2].map(function (i) { return $("#n" + i); }), btns = [$("#run"), $("#run2")];
    chat.innerHTML = ""; nodes.forEach(function (n) { n.className = "node"; }); btns.forEach(function (b) { b.disabled = true; });
    nodes[0].classList.add("active");
    var D = B.D, rows = D.m.map(function (m, i) { return { month: m, sales: D.s[i], expenses: D.e[i] }; });
    try {
      await API.analyze({ rows: rows }, function (ev, d) {
        if (ev === "agent") {
          var i = Math.max(0, NAMES.indexOf(d.agent));
          nodes[i].classList.remove("active"); nodes[i].classList.add("done");
          if (nodes[i + 1]) nodes[i + 1].classList.add("active");
          var m = document.createElement("div"); m.className = "msg b" + (i + 1);
          m.innerHTML = "<b>" + esc(d.agent) + "</b><span></span>"; chat.appendChild(m);
          B.typeInto(m.querySelector("span"), d.content);
        } else if (ev === "error") { B.toast(d.message); }
      });
      await refresh();
      B.toast("Report saved. Open the Report tab.");
    } catch (e) {
      B.toast(e.message);
      if (/upgrade/i.test(e.message)) location.hash = "#billing";
    }
    nodes.forEach(function (n) { n.classList.remove("active"); });
    btns.forEach(function (b) { b.disabled = false; });
    running = false;
  };

  L.pay = async function (p) {
    try {
      await API.submitPayment(p);
      $("#pay").classList.add("hide"); $("#pf").reset();
      await refresh(); location.hash = "#billing"; B.renderBilling();
      B.toast("Payment submitted. We will verify it and activate your plan.");
    } catch (e) { B.toast(e.message); }
  };

  L.chat = function (q, ok, fail) {
    var D = B.D, rows = D.m.map(function (m, i) { return { month: m, sales: D.s[i], expenses: D.e[i] }; });
    API.chat(q, rows).then(function (r) { ok(r.answer); }).catch(fail);
  };

  async function loadAdmin() {
    var box = $("#adm");
    try {
      var list = await API.adminPayments("pending");
      if (!list.length) { box.innerHTML = '<div class="empty">No payments waiting for review.</div>'; return; }
      box.innerHTML = list.map(function (p) {
        return '<div class="item"><div><b>' + esc(p.email || p.uid) + "</b> wants " + esc(p.plan) + " (Rs " + esc(p.amount) + ") via " + esc(p.method) +
          '<div class="sub" style="margin:0">Transaction ' + esc(p.tid) + " | Phone " + esc(p.phone) + '</div></div>' +
          '<button class="btn sp" data-a="approve" data-id="' + esc(p.id) + '">Approve</button>' +
          '<button class="btn ghost" data-a="reject" data-id="' + esc(p.id) + '">Reject</button></div>';
      }).join("");
      box.querySelectorAll("button").forEach(function (b) {
        b.onclick = async function () {
          b.disabled = true;
          try { await (b.dataset.a === "approve" ? API.approve(b.dataset.id) : API.reject(b.dataset.id)); B.toast("Payment " + b.dataset.a + "d."); } catch (e) { B.toast(e.message); }
          loadAdmin();
        };
      });
    } catch (e) { box.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; }
  }
  L.onRoute = function (h) { if (h === "#admin") loadAdmin(); };
})();