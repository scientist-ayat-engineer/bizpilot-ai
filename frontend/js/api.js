/* BizPilot API client (plain script, no build step).
   Set window.BIZPILOT_API before loading this file, e.g. "https://your-api.vercel.app".
   Provide window.bpGetToken = async () => firebase auth currentUser.getIdToken() once Firebase Auth is added. */
(function () {
  var BASE = window.BIZPILOT_API || "http://localhost:8000";

  async function headers() {
    var h = { "Content-Type": "application/json" };
    if (window.bpGetToken) {
      var t = await window.bpGetToken();
      if (t) h.Authorization = "Bearer " + t;
    }
    return h;
  }

  function errMsg(d, status) {
    var m = d && d.detail;
    if (typeof m === "string") return m;
    if (Array.isArray(m)) return "Please check the data you entered.";
    return "Request failed (" + status + ")";
  }

  async function call(method, path, body) {
    var r = await fetch(BASE + path, { method: method, headers: await headers(), body: body ? JSON.stringify(body) : undefined });
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(errMsg(data, r.status));
    return data;
  }

  /* Streams agent messages. onEvent(name, data) is called for "agent", "done" and "error". */
  async function analyze(payload, onEvent) {
    var r = await fetch(BASE + "/api/analyze", { method: "POST", headers: await headers(), body: JSON.stringify(payload) });
    if (!r.ok) {
      var e = await r.json().catch(function () { return {}; });
      throw new Error(errMsg(e, r.status));
    }
    var reader = r.body.getReader(), dec = new TextDecoder(), buf = "";
    for (;;) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buf += dec.decode(chunk.value, { stream: true });
      var parts = buf.split("\n\n");
      buf = parts.pop();
      parts.forEach(function (p) {
        var ev = (p.match(/^event: (.*)$/m) || [])[1], d = (p.match(/^data: (.*)$/m) || [])[1];
        if (ev && d) onEvent(ev, JSON.parse(d));
      });
    }
  }

  window.BizAPI = {
    me: function () { return call("GET", "/api/me"); },
    analyze: analyze,
    chat: function (question, rows) { return call("POST", "/api/chat", { question: question, rows: rows }); },
    reports: function () { return call("GET", "/api/reports"); },
    submitPayment: function (p) { return call("POST", "/api/payments", p); },
    myPayments: function () { return call("GET", "/api/payments"); },
    adminPayments: function (status) { return call("GET", "/api/admin/payments?status=" + (status || "pending")); },
    approve: function (id) { return call("POST", "/api/admin/payments/" + id + "/approve"); },
    reject: function (id) { return call("POST", "/api/admin/payments/" + id + "/reject"); }
  };
})();