// MIDMEN file drop page: hands ONE file to MIDMEN when Claude's own sandbox cannot reach the upload link. Static; no keys.
// The one-time upload address is in the #fragment of this page's address (a fragment is never sent to the web host of this page, so the secret does not reach
// its logs); it is read here, checked to be a MIDMEN upload address, and the file is sent to it with PUT. Nothing is stored in the browser.
(function () {
  "use strict";
  var card = document.getElementById("card");
  var target = "";
  try { target = decodeURIComponent(location.hash.replace(/^#/, "")); } catch (e) { target = ""; }
  // only a MIDMEN upload address is ever used: https://<project>.supabase.co/functions/v1/mcp/upload/up_<24 hex>?k=<48 hex>
  var OK = /^https:\/\/[a-z0-9]+\.supabase\.co\/functions\/v1\/mcp\/upload\/up_[0-9a-f]{24}\?k=[0-9a-f]{48}$/;
  if (window.top !== window.self) { document.body.textContent = "This page cannot be shown inside another page."; return; }
  if (history.replaceState) { try { history.replaceState(null, "", location.pathname); } catch (e) { /* keep the fragment */ } }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "text") n.textContent = attrs[k]; else if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function show() { card.replaceChildren.apply(card, arguments); }
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }

  if (!OK.test(target)) {
    show(el("h1", { text: "This link is not complete" }), el("p", { text: "Open the exact link Claude gave you, including everything after the # sign." }), el("p", { class: "muted", text: "Ask Claude for a new link if it does not work." }));
    return;
  }

  function send(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { show(el("h1", { text: "File too large" }), el("p", { text: file.name + " is " + size(file.size) + ". The limit is 15 MB." }), again()); return; }
    show(el("h1", { text: "Sending…" }), el("p", { text: file.name + " (" + size(file.size) + ")" }));
    fetch(target, { method: "PUT", body: file })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, json: j }; }); })
      .then(function (r) {
        if (r.ok && r.json.ok) {
          target = ""; // the link is used up
          show(el("h1", { class: "ok", text: "Sent" }), el("p", { text: file.name + " (" + size(file.size) + ") reached MIDMEN." }), el("p", { class: "muted", text: "Go back to Claude and say it is done. You can close this tab." }));
        } else {
          show(el("h1", { text: "MIDMEN did not accept the file" }), el("p", { class: "err", text: r.json.error || "Something went wrong." }), el("p", { class: "muted", text: "If the link is no longer valid, ask Claude for a new one." }), again());
        }
      }).catch(function () { show(el("h1", { text: "No connection" }), el("p", { text: "The file was not sent. Check your connection and try again." }), again()); });
  }
  function again() { var b = el("button", { type: "button", text: "Choose the file again" }); b.onclick = start; return b; }

  function start() {
    var input = el("input", { type: "file", id: "f", accept: ".xlsx,.pdf,.docx,.pptx" });
    var pick = el("button", { type: "button", text: "Choose a file" });
    pick.onclick = function () { input.click(); };
    input.onchange = function () { send(input.files && input.files[0]); };
    var zone = el("div", { class: "drop", id: "zone" }, [el("p", { text: "Drop the file here" }), el("p", { class: "muted", text: "or" }), pick, input]);
    ["dragenter", "dragover"].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove("over"); }); });
    zone.addEventListener("drop", function (e) { send(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
    show(el("h1", { text: "Send a file to MIDMEN" }), el("p", { text: "Claude asked for this file (an Excel model, a PDF or a Word/PowerPoint document)." }), zone);
  }
  start();
})();
