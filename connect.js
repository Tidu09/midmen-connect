// MIDMEN connect page: the "Allow" step of the sign-in for Claude (OAuth). Static; talks only to Supabase Auth and the MIDMEN `mcp` function.
// The sign-in session lives in this tab's memory only (nothing is stored in the browser) and is used once, to approve this one request.
(function () {
  "use strict";
  var SUPABASE_URL = "https://haemyptqidpvsyjbdeff.supabase.co";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZW15cHRxaWRwdnN5amJkZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNjYwMDQsImV4cCI6MjEwNjk0MjAwNH0.l_aGMSP4iZnlJzmJzsap1MSA_722Yetf-FceFTOMzhk"; // the public (anon) key, the same one the Excel add-in uses
  var MCP = SUPABASE_URL + "/functions/v1/mcp";
  var card = document.getElementById("card");
  var reqId = new URLSearchParams(location.search).get("req") || "";
  var details = null, session = null, email = "";

  if (window.top !== window.self) { document.body.textContent = "This page cannot be shown inside another page."; return; }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "text") n.textContent = attrs[k]; else if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function show() { card.replaceChildren.apply(card, arguments); var f = card.querySelector("input,button.primary"); if (f) f.focus(); }
  function fail(msg) { show(el("h1", { text: "This sign-in cannot continue" }), el("p", { text: msg }), el("p", { class: "muted", text: "Go back to Claude and add the MIDMEN connector again." })); }
  function errBox(msg) { var e = card.querySelector(".err"); if (e) e.remove(); card.appendChild(el("div", { class: "err", role: "alert", text: msg })); }

  function authCall(path, body) {
    return fetch(SUPABASE_URL + "/auth/v1/" + path, { method: "POST", headers: { apikey: ANON_KEY, "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, json: j }; }); });
  }

  function appLine() {
    var host = details.redirect_host ? " (returns to " + details.redirect_host + ")" : "";
    return el("p", {}, [el("span", { class: "app", text: details.client_name }), document.createTextNode(" wants to connect to your MIDMEN workspaces" + host + ".")]);
  }

  function stepEmail(msg) {
    var input = el("input", { type: "email", id: "email", autocomplete: "email", placeholder: "you@company.com", required: "required" });
    if (email) input.value = email;
    var go = el("button", { class: "primary", type: "button", text: "Email me a code" });
    go.onclick = function () {
      email = input.value.trim();
      if (!email) return errBox("Enter your email.");
      go.disabled = true; go.textContent = "Sending…";
      authCall("otp", { email: email, create_user: false }).then(function (r) {
        if (!r.ok) { go.disabled = false; go.textContent = "Email me a code"; return errBox(r.status === 422 || r.status === 400 ? "No MIDMEN account for that email. Use the email you sign in with in Excel." : "Could not send the code. Try again in a minute."); }
        stepCode();
      }).catch(function () { go.disabled = false; go.textContent = "Email me a code"; errBox("No connection. Try again."); });
    };
    input.onkeydown = function (e) { if (e.key === "Enter") go.click(); };
    show(el("h1", { text: "Sign in to MIDMEN" }), appLine(), el("p", { class: "muted", text: msg || "Use the same email you sign in with in the Excel add-in. We will email you an 8-digit code." }),
      el("label", { for: "email", text: "Email" }), input, el("div", { class: "row" }, [go]));
  }

  function stepCode() {
    var input = el("input", { type: "text", id: "code", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "8", placeholder: "8-digit code" });
    var go = el("button", { class: "primary", type: "button", text: "Continue" });
    var back = el("button", { type: "button", text: "Use another email" });
    back.onclick = function () { stepEmail(); };
    go.onclick = function () {
      var code = input.value.replace(/\s+/g, "");
      if (!/^\d{6,8}$/.test(code)) return errBox("Enter the code from the email.");
      go.disabled = true; go.textContent = "Checking…";
      authCall("verify", { type: "email", email: email, token: code }).then(function (r) {
        if (!r.ok || !r.json.access_token) { go.disabled = false; go.textContent = "Continue"; return errBox("That code did not work. Check it and try again, or request a new one."); }
        session = r.json; stepAllow();
      }).catch(function () { go.disabled = false; go.textContent = "Continue"; errBox("No connection. Try again."); });
    };
    input.onkeydown = function (e) { if (e.key === "Enter") go.click(); };
    show(el("h1", { text: "Enter your code" }), el("p", { class: "muted", text: "We sent an 8-digit code to " + email + "." }), el("label", { for: "code", text: "Code" }), input, el("div", { class: "row" }, [go, back]));
  }

  function decide(decision, btns, write) {
    btns.forEach(function (b) { b.disabled = true; });
    fetch(MCP + "/oauth/approve", { method: "POST", headers: { authorization: "Bearer " + session.access_token, "content-type": "application/json" }, body: JSON.stringify({ req: reqId, decision: decision, write: write === true }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, json: j }; }); })
      .then(function (r) {
        if (!r.ok || !r.json.redirect_to) { btns.forEach(function (b) { b.disabled = false; }); return errBox(r.json.error_description || "Could not complete the sign-in. Go back to Claude and try again."); }
        session = null;
        show(el("h1", { class: decision === "allow" ? "ok" : "", text: decision === "allow" ? "Connected" : "Not connected" }), el("p", { text: "Returning to " + details.client_name + "…" }), el("p", { class: "muted", text: "If nothing happens, you can close this tab and go back to Claude." }));
        location.replace(r.json.redirect_to);
      }).catch(function () { btns.forEach(function (b) { b.disabled = false; }); errBox("No connection. Try again."); });
  }

  function stepAllow() {
    var allow = el("button", { class: "primary", type: "button", text: "Allow" });
    var deny = el("button", { type: "button", text: "Don't allow" });
    // off by default: only a ticked box gives the connection the right to change things (publish models, register and stamp documents, record citations)
    var tick = el("input", { type: "checkbox", id: "write" });
    var tickRow = el("label", { class: "tick", for: "write" }, [tick, el("span", { text: "Let Claude change this workspace: create workspaces, publish models, register and stamp documents, record source citations. You must be an owner or editor of the workspace; viewers can never change it." })]);
    allow.onclick = function () { decide("allow", [allow, deny, tick], tick.checked); };
    deny.onclick = function () { decide("deny", [allow, deny, tick], false); };
    show(
      el("h1", { text: "Allow " + details.client_name + "?" }),
      el("p", { class: "muted", text: "Signed in as " + email }),
      appLine(),
      el("p", { text: "It will be able to:" }),
      el("ul", {}, [
        el("li", { text: "read the published numbers of the workspaces you can read, and where each comes from" }),
        el("li", { text: "read change reports between versions" }),
      ]),
      el("p", { text: "Unless you tick the box below it cannot change anything. It never uses AI through MIDMEN. Every call is logged, and you can disconnect it any time in the Excel add-in." }),
      tickRow,
      el("div", { class: "row" }, [allow, deny]));
  }

  if (!/^[0-9a-f]{32}$/.test(reqId)) { fail("The link is missing its request code."); return; }
  fetch(MCP + "/oauth/request?req=" + encodeURIComponent(reqId))
    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, json: j }; }); })
    .then(function (r) { if (!r.ok) return fail(r.json.error_description || "This sign-in request has expired."); details = r.json; stepEmail(); })
    .catch(function () { fail("Could not reach MIDMEN. Check your connection and reload."); });
})();
