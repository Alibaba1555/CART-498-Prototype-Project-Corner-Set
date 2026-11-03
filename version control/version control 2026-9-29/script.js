"use strict";

const $ = (selector) => document.querySelector(selector);
const KEY = "corner-set-prototype-v1";

let screen = "home";
let session = null;
let pendingSync = false;
let simulatedOffline = false;
let syncing = false;
let syncTimeout;
let toastTimeout;

const isOffline = () => simulatedOffline || !navigator.onLine;

// Read only this prototype's saved data.
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");

  if (saved?.version === 1) {
    pendingSync = saved.pendingSync === true;
    const s = saved.session;

    if (
      s &&
      Number.isFinite(s.startedAt) &&
      Number.isFinite(s.endsAt) &&
      Number.isFinite(s.totalMs) &&
      s.totalMs > 0 &&
      (s.endedAt === null || Number.isFinite(s.endedAt))
    ) {
      session = s;
    }
  }
} catch {
  $("#storage-note").hidden = false;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      version: 1,
      session,
      pendingSync
    }));
  } catch {
    $("#storage-note").hidden = false;
  }
}

function showScreen(name, focus = true) {
  screen = name;

  document.querySelectorAll(".screen").forEach((section) => {
    section.hidden = section.id !== name;
  });

  update();

  if (focus) {
    document.querySelector(`#${name} h2`)?.focus();
  }
}

function toast(message) {
  clearTimeout(toastTimeout);
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  toastTimeout = setTimeout(() => {
    $("#toast").hidden = true;
  }, 3000);
}

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isActive() {
  return session !== null && session.endedAt === null;
}

function finish(automatic = false) {
  if (!isActive()) return;

  session.endedAt = automatic ? session.endsAt : Date.now();
  session.automatic = automatic;

  // In this local demo, online changes are immediately "synced".
  // A production app would wait for a server acknowledgement.
  pendingSync = isOffline() || syncing;

  save();

  if ($("#end-dialog").open) {
    $("#end-dialog").close("cancel");
  }

  showScreen("finished");
}

function update() {
  const offline = isOffline();
  const active = isActive();

  if (active && Date.now() >= session.endsAt) {
    finish(true);
    return;
  }

  $("#connection").textContent = offline
    ? "○ OFFLINE"
    : syncing ? "◌ SYNCING" : "● ONLINE";

  $("#publish").disabled = offline || syncing || pendingSync;
  $("#fast-forward").disabled = !active;
  $("#start").disabled = pendingSync || syncing;

  let notice = "";

  if (offline) {
    notice = active
      ? "Offline — timer continues locally. Changes will sync when reconnected."
      : pendingSync
        ? "Offline — set ended locally. Public removal is not yet confirmed."
        : "Offline — reconnect before publishing a new set.";
  } else if (syncing) {
    notice = "Reconnected — simulating synchronization…";
  }

  $("#network-note").textContent = notice;
  $("#network-note").hidden = !notice;

  if (active) {
    const remaining = Math.max(0, session.endsAt - Date.now());
    const endingSoon = remaining <= 5 * 60 * 1000;

    // Design assumption for this version: "Ending soon" = last 5 minutes.
    $("#live-state").textContent = endingSoon ? "ENDING SOON" : "LIVE NOW";
    $("#live-state").style.color = endingSoon ? "var(--orange)" : "";
    $("#timer").textContent = formatTime(remaining);
    $("#end-time").textContent = `Scheduled end · ${formatClock(session.endsAt)}`;

    $("#timer-ring").style.setProperty(
      "--progress",
      `${Math.min(100, remaining / session.totalMs * 100)}%`
    );

    $("#listing-status").textContent = pendingSync
      ? "Local changes pending — public listing may be out of date."
      : offline
        ? "Last published area retained. Public status cannot be verified offline."
        : "Your area is visible on the demo map.";
  }

  if (session?.endedAt !== null && session) {
    const elapsed = Math.max(0, session.endedAt - session.startedAt);
    $("#played").textContent = formatTime(elapsed);

    $("#finish-status").textContent = pendingSync
      ? "Ended on this device. Map removal will be requested when reconnected."
      : session.automatic
        ? "Time is up. Your listing has been removed from the demo map."
        : "Your set has ended and the demo map listing is cleared.";
  }

  if ($("#end-dialog").open) {
    $("#end-warning").textContent = offline || syncing
      ? "This ends the set on your device. Public map removal cannot be confirmed until synchronization finishes."
      : "Your performance will be removed from the demo map.";
  }
}

function connectionChanged() {
  clearTimeout(syncTimeout);
  syncing = false;

  if (!isOffline() && pendingSync) {
    syncing = true;

    // Demo only: no network request or real server is involved.
    syncTimeout = setTimeout(() => {
      if (isOffline()) {
        syncing = false;
        update();
        return;
      }

      pendingSync = false;
      syncing = false;
      save();
      update();
      toast("Demo changes synchronized.");
    }, 1200);
  }

  update();
}

$("#start").addEventListener("click", () => showScreen("setup"));
$("#back").addEventListener("click", () => showScreen("home"));

$("#publish").addEventListener("click", () => {
  if (isOffline() || syncing || pendingSync) {
    toast("Reconnect and finish syncing before publishing.");
    return;
  }

  const minutes = Number(
    document.querySelector('input[name="duration"]:checked').value
  );

  const now = Date.now();

  session = {
    startedAt: now,
    endsAt: now + minutes * 60 * 1000,
    totalMs: minutes * 60 * 1000,
    endedAt: null,
    automatic: false
  };

  pendingSync = false;
  save();
  showScreen("live");
  toast("You’re live on the demo map.");
});

$("#extend").addEventListener("click", () => {
  if (!isActive()) return;

  if (Date.now() >= session.endsAt) {
    finish(true);
    return;
  }

  const extension = 15 * 60 * 1000;
  session.endsAt += extension;
  session.totalMs += extension;

  if (isOffline() || syncing) pendingSync = true;

  save();
  update();

  toast(pendingSync
    ? "15 minutes added locally — synchronization pending."
    : "15 minutes added. Keep playing.");
});

$("#end").addEventListener("click", () => {
  if (!isActive()) return;
  $("#end-dialog").showModal();
  update();
});

$("#end-dialog").addEventListener("close", () => {
  if ($("#end-dialog").returnValue === "end") finish();
});

$("#again").addEventListener("click", () => showScreen("home"));

$("#offline-toggle").addEventListener("change", (event) => {
  simulatedOffline = event.target.checked;
  connectionChanged();
});

$("#fast-forward").addEventListener("click", () => {
  if (!isActive()) return;

  session.endsAt = Date.now() + 10000;
  if (isOffline() || syncing) pendingSync = true;

  save();
  update();
  toast("Demo timer moved to its last 10 seconds.");
});

window.addEventListener("online", connectionChanged);
window.addEventListener("offline", connectionChanged);
document.addEventListener("visibilitychange", update);

// Absolute end timestamps avoid timer drift when tabs are inactive.
// No network is required for the running timer.
setInterval(update, 250);

if (isActive()) {
  showScreen("live", false);
} else if (session) {
  showScreen("finished", false);
} else {
  showScreen("home", false);
}

connectionChanged();