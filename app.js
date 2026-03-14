const config = window.APP_CONFIG || {};

const state = {
  lyrics: [],
  activeLyricIndex: -1,
  sessionDurationSeconds: Number(config.sessionDurationSeconds || 0),
  sessionTimerId: null,
  attendancePollId: null,
  heartbeatId: null,
  joined: false,
  displayName: "",
  autoStartEnabled: localStorage.getItem("gongxiu:autoStart") === "1",
  autoJoinEnabled: localStorage.getItem("gongxiu:autoJoinAttendance") !== "0",
  clientId: getOrCreateClientId(),
  playbackUnlocked: false,
  sessionKey: null,
  modalOpen: false,
};

const dom = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheDom();
  applySiteCopy();
  bindEvents();
  dom.autoStartToggle.checked = state.autoStartEnabled;
  dom.audio.src = config.audioUrl || "";
  dom.audio.load();
  restoreIdentity();
  renderIdentity();
  updateAudioNote();
  updateDurationUi();
  startClock();
  await loadLyrics();
  if (state.displayName && state.autoJoinEnabled) {
    await joinPractice({ auto: true });
  } else {
    await refreshAttendees();
  }
}

function cacheDom() {
  dom.siteTitle = document.querySelector("#site-title");
  dom.siteDescription = document.querySelector("#site-description");
  dom.timezoneLabel = document.querySelector("#timezone-label");
  dom.startTimeLabel = document.querySelector("#start-time-label");
  dom.roomStatusPill = document.querySelector("#room-status-pill");
  dom.sessionStatus = document.querySelector("#session-status");
  dom.sessionSubstatus = document.querySelector("#session-substatus");
  dom.syncButton = document.querySelector("#sync-button");
  dom.playButton = document.querySelector("#play-button");
  dom.pauseButton = document.querySelector("#pause-button");
  dom.restartButton = document.querySelector("#restart-button");
  dom.progressRange = document.querySelector("#progress-range");
  dom.currentTime = document.querySelector("#current-time");
  dom.durationTime = document.querySelector("#duration-time");
  dom.identityName = document.querySelector("#identity-name");
  dom.identityNote = document.querySelector("#identity-note");
  dom.joinButton = document.querySelector("#join-button");
  dom.editNameButton = document.querySelector("#edit-name-button");
  dom.autoStartToggle = document.querySelector("#auto-start-toggle");
  dom.autoplayNote = document.querySelector("#autoplay-note");
  dom.audioNote = document.querySelector("#audio-note");
  dom.audio = document.querySelector("#practice-audio");
  dom.lyricsList = document.querySelector("#lyrics-list");
  dom.attendeeCount = document.querySelector("#attendee-count");
  dom.attendeeList = document.querySelector("#attendee-list");
  dom.nameModal = document.querySelector("#name-modal");
  dom.modalDisplayName = document.querySelector("#modal-display-name");
  dom.rememberJoinToggle = document.querySelector("#remember-join-toggle");
  dom.modalCancelButton = document.querySelector("#modal-cancel-button");
  dom.modalSecondaryButton = document.querySelector("#modal-secondary-button");
  dom.modalConfirmButton = document.querySelector("#modal-confirm-button");
}

function applySiteCopy() {
  dom.siteTitle.textContent = config.siteTitle || "皈依共修";
  dom.siteDescription.textContent =
    config.siteDescription || "每天东八区早上 6:00 开始，同步音频进度与在线名单。";
  dom.timezoneLabel.textContent = config.timezoneLabel || "UTC+8";
  dom.startTimeLabel.textContent = config.dailyStart || "06:00";
}

function bindEvents() {
  dom.playButton.addEventListener("click", () => playAudio(false));
  dom.pauseButton.addEventListener("click", () => dom.audio.pause());
  dom.restartButton.addEventListener("click", () => {
    dom.audio.currentTime = 0;
    playAudio(false);
  });
  dom.syncButton.addEventListener("click", async () => {
    syncToLivePosition();
    await playAudio(true);
  });
  dom.progressRange.addEventListener("input", onSeekInput);
  dom.joinButton.addEventListener("click", onJoinButtonClick);
  dom.editNameButton.addEventListener("click", openNameModal);
  dom.autoStartToggle.addEventListener("change", onAutoStartToggleChange);
  dom.modalCancelButton.addEventListener("click", closeNameModal);
  dom.modalSecondaryButton.addEventListener("click", closeNameModal);
  dom.modalConfirmButton.addEventListener("click", onModalConfirm);
  dom.modalDisplayName.addEventListener("keydown", onModalInputKeyDown);
  dom.nameModal.addEventListener("click", onModalShellClick);
  dom.audio.addEventListener("loadedmetadata", onLoadedMetadata);
  dom.audio.addEventListener("timeupdate", onTimeUpdate);
  dom.audio.addEventListener("ended", onAudioEnded);
  document.addEventListener("pointerdown", markPlaybackInteraction, { once: true });
  document.addEventListener("keydown", onDocumentKeyDown);
  window.addEventListener("beforeunload", onBeforeUnload);
}

async function loadLyrics() {
  if (!config.lyricsUrl) {
    renderLyricsEmpty("未配置字幕文件。");
    return;
  }

  try {
    const response = await fetch(config.lyricsUrl);
    if (!response.ok) {
      throw new Error(`lyrics request failed: ${response.status}`);
    }
    const text = await response.text();
    state.lyrics = parseLrc(text);
    if (!state.lyrics.length) {
      renderLyricsEmpty("字幕内容为空。");
      return;
    }
    if (!state.sessionDurationSeconds) {
      state.sessionDurationSeconds =
        Math.ceil(state.lyrics[state.lyrics.length - 1].time) + 15;
    }
    renderLyrics();
    updateDurationUi();
    updateSessionState();
  } catch (error) {
    console.error(error);
    renderLyricsEmpty("字幕加载失败，请确认 `assets/guiyi.lrc` 是否存在。");
  }
}

function parseLrc(input) {
  const rows = input.split(/\r?\n/);
  const entries = [];
  const timePattern = /\[(\d+):(\d+(?:\.\d+)?)\]/g;

  for (const rawRow of rows) {
    const row = rawRow.trim();
    if (!row) {
      continue;
    }

    const times = [...row.matchAll(timePattern)];
    if (!times.length) {
      continue;
    }

    const html = row.replace(timePattern, "").trim();
    for (const match of times) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      entries.push({
        time: minutes * 60 + seconds,
        html: html || "&nbsp;",
      });
    }
  }

  entries.sort((a, b) => a.time - b.time);
  return entries;
}

function renderLyrics() {
  dom.lyricsList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.lyrics.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "lyrics-line";
    item.dataset.index = String(index);
    item.dataset.time = String(entry.time);
    item.innerHTML = `
      <span class="lyrics-time">${formatTime(entry.time)}</span>
      <div class="lyrics-text">${entry.html}</div>
    `;
    item.addEventListener("click", () => {
      dom.audio.currentTime = entry.time;
      highlightLyric(index, true);
    });
    fragment.appendChild(item);
  });

  dom.lyricsList.appendChild(fragment);
}

function renderLyricsEmpty(message) {
  dom.lyricsList.innerHTML = "";
  const item = document.createElement("li");
  item.className = "lyrics-empty";
  item.textContent = message;
  dom.lyricsList.appendChild(item);
}

async function playAudio(syncToLiveFirst) {
  markPlaybackInteraction();
  if (syncToLiveFirst) {
    syncToLivePosition();
  }
  try {
    await dom.audio.play();
    dom.audioNote.textContent = "";
  } catch (error) {
    console.error(error);
    dom.audioNote.textContent = "播放被浏览器拦截，请先手动点一次播放按钮。";
    dom.audioNote.classList.add("is-warning");
  }
}

function onLoadedMetadata() {
  if (Number.isFinite(dom.audio.duration) && dom.audio.duration > 0) {
    state.sessionDurationSeconds = Math.ceil(dom.audio.duration);
    updateDurationUi();
    updateSessionState();
  }
}

function onTimeUpdate() {
  const current = dom.audio.currentTime || 0;
  const duration = dom.audio.duration || state.sessionDurationSeconds || 0;
  dom.progressRange.max = String(Math.max(1000, Math.floor(duration * 10)));
  dom.progressRange.value = String(Math.floor(current * 10));
  dom.currentTime.textContent = formatTime(current);
  dom.durationTime.textContent = formatTime(duration);

  const lyricIndex = findLyricIndex(current);
  highlightLyric(lyricIndex, false);
}

function onAudioEnded() {
  highlightLyric(-1, false);
  updateSessionState();
}

function onSeekInput() {
  dom.audio.currentTime = Number(dom.progressRange.value) / 10;
}

function highlightLyric(index, forceScroll) {
  if (index === state.activeLyricIndex && !forceScroll) {
    return;
  }

  const previous = dom.lyricsList.querySelector(".lyrics-line.is-active");
  if (previous) {
    previous.classList.remove("is-active");
  }

  state.activeLyricIndex = index;
  if (index < 0) {
    return;
  }

  const next = dom.lyricsList.querySelector(`[data-index="${index}"]`);
  if (!next) {
    return;
  }

  next.classList.add("is-active");
  if (forceScroll || shouldScrollIntoView(next)) {
    next.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function shouldScrollIntoView(element) {
  const frame = element.closest(".lyrics-frame");
  if (!frame) {
    return false;
  }
  const frameRect = frame.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return (
    elementRect.top < frameRect.top + frameRect.height * 0.2 ||
    elementRect.bottom > frameRect.bottom - frameRect.height * 0.2
  );
}

function findLyricIndex(currentTime) {
  if (!state.lyrics.length) {
    return -1;
  }

  let low = 0;
  let high = state.lyrics.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const current = state.lyrics[mid];
    const next = state.lyrics[mid + 1];

    if (
      current.time <= currentTime &&
      (!next || currentTime < next.time)
    ) {
      return mid;
    }

    if (current.time > currentTime) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return Math.max(0, low - 1);
}

function startClock() {
  clearInterval(state.sessionTimerId);
  state.sessionTimerId = window.setInterval(updateSessionState, 1000);
  updateSessionState();
}

function updateSessionState() {
  const session = getSessionWindow();
  state.sessionKey = session.sessionKey;

  if (session.isLive) {
    dom.roomStatusPill.textContent = "进行中";
    dom.sessionStatus.textContent = `今日共修进行中，已进行 ${formatTime(session.elapsedSeconds)}。`;
    dom.sessionSubstatus.textContent = `当前场次：${session.sessionKey}，点击“同步到现场”可直接进入同一进度。`;
    maybeAutoStart(session);
  } else {
    dom.roomStatusPill.textContent = "待开始";
    dom.sessionStatus.textContent = `距离下一场共修还有 ${formatCountdown(session.countdownMs)}。`;
    dom.sessionSubstatus.textContent = `下一场将于 ${session.nextStartLabel} 开始。`;
  }
}

function maybeAutoStart(session) {
  if (!state.autoStartEnabled || !state.playbackUnlocked || !session.isLive) {
    return;
  }

  if (dom.audio.paused && session.elapsedSeconds <= 8) {
    syncToLivePosition();
    playAudio(false);
  }
}

function syncToLivePosition() {
  const session = getSessionWindow();
  if (!session.isLive) {
    dom.audio.currentTime = 0;
    highlightLyric(findLyricIndex(0), true);
    return;
  }

  const nextTime = Math.min(
    session.elapsedSeconds,
    dom.audio.duration || state.sessionDurationSeconds || session.elapsedSeconds
  );
  dom.audio.currentTime = Math.max(0, nextTime);
  highlightLyric(findLyricIndex(dom.audio.currentTime), true);
}

function onAutoStartToggleChange() {
  state.autoStartEnabled = dom.autoStartToggle.checked;
  localStorage.setItem("gongxiu:autoStart", state.autoStartEnabled ? "1" : "0");
  if (state.autoStartEnabled) {
    markPlaybackInteraction();
  }
}

function markPlaybackInteraction() {
  state.playbackUnlocked = true;
  dom.autoplayNote.textContent =
    "已记录本机交互；若页面保持打开，6:00 到点后会尝试自动开播。";
}

function updateAudioNote() {
  if (!config.audioUrl) {
    dom.audioNote.textContent = "尚未配置音频地址，请编辑 assets/site-config.js。";
    dom.audioNote.classList.add("is-warning");
    return;
  }

  dom.audioNote.textContent =
    "若暂时无法播放，请稍后重试，或先点一次播放按钮。";
  dom.audioNote.classList.remove("is-warning");
}

function updateDurationUi() {
  dom.durationTime.textContent = formatTime(state.sessionDurationSeconds || 0);
  dom.progressRange.max = String(
    Math.max(1000, Math.floor((state.sessionDurationSeconds || 1) * 10))
  );
}

function restoreIdentity() {
  const savedName = localStorage.getItem("gongxiu:displayName");
  state.displayName = savedName ? savedName.trim() : "";

  const savedAutoJoin = localStorage.getItem("gongxiu:autoJoinAttendance");
  if (savedAutoJoin !== null) {
    state.autoJoinEnabled = savedAutoJoin === "1";
  }

  dom.modalDisplayName.value = state.displayName;
  dom.rememberJoinToggle.checked = state.autoJoinEnabled;
}

async function onJoinButtonClick() {
  if (state.joined) {
    await leavePractice();
    return;
  }

  if (!state.displayName) {
    openNameModal();
    return;
  }

  await joinPractice();
}

function startPresence() {
  stopPresence();
  state.heartbeatId = window.setInterval(async () => {
    await upsertAttendance();
  }, Number(config.heartbeatIntervalMs || 20000));
  state.attendancePollId = window.setInterval(async () => {
    await refreshAttendees();
  }, 15000);
  refreshAttendees();
}

function stopPresence() {
  clearInterval(state.heartbeatId);
  clearInterval(state.attendancePollId);
  state.heartbeatId = null;
  state.attendancePollId = null;
}

async function upsertAttendance() {
  const name = state.displayName.trim();
  if (!name) {
    return;
  }

  const backendReady = hasSupabaseConfig();
  if (!backendReady) {
    renderAttendees([
      {
        client_id: state.clientId,
        display_name: name,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      },
    ]);
    return;
  }

  const payload = {
    client_id: state.clientId,
    session_id: state.sessionKey || getSessionWindow().sessionKey,
    display_name: name,
    joined_at: new Date().toISOString(),
    last_seen: new Date().toISOString(),
  };

  try {
    const response = await fetch(
      `${config.supabase.url}/rest/v1/${config.supabase.table}`,
      {
        method: "POST",
        headers: supabaseHeaders({
          Prefer: "resolution=merge-duplicates,return=representation",
        }),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`attendance upsert failed: ${response.status}`);
    }

    await refreshAttendees();
  } catch (error) {
    console.error(error);
    dom.audioNote.textContent = "在线名单写入失败，请检查 Supabase 配置与资料表权限。";
    dom.audioNote.classList.add("is-warning");
  }
}

async function refreshAttendees() {
  if (!hasSupabaseConfig()) {
    const name = state.displayName.trim();
    if (!state.joined || !name) {
      renderAttendees([]);
      return;
    }
    renderAttendees([
      {
        client_id: state.clientId,
        display_name: name,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      },
    ]);
    return;
  }

  const cutoff = new Date(
    Date.now() - Number(config.attendeeVisibleWindowMs || 90000)
  ).toISOString();

  const params = new URLSearchParams({
    select: "client_id,display_name,joined_at,last_seen,session_id",
    session_id: `eq.${state.sessionKey || getSessionWindow().sessionKey}`,
    last_seen: `gte.${cutoff}`,
    order: "last_seen.desc",
  });

  try {
    const response = await fetch(
      `${config.supabase.url}/rest/v1/${config.supabase.table}?${params.toString()}`,
      {
        headers: supabaseHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`attendance fetch failed: ${response.status}`);
    }

    const rows = await response.json();
    renderAttendees(rows);
  } catch (error) {
    console.error(error);
    renderAttendees([]);
  }
}

function renderAttendees(rows) {
  dom.attendeeCount.textContent = `${rows.length} 人`;
  dom.attendeeList.innerHTML = "";

  if (!rows.length) {
    const item = document.createElement("li");
    item.className = "attendee-empty";
    item.textContent = hasSupabaseConfig()
      ? "当前场次还没有人在场。"
      : "尚未配置 Supabase，目前无法共享在线名单。";
    dom.attendeeList.appendChild(item);
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="attendee-name">${escapeHtml(row.display_name || "未命名")}</span>
      <span class="attendee-meta">最后心跳 ${formatRelative(row.last_seen)}</span>
    `;
    fragment.appendChild(item);
  });
  dom.attendeeList.appendChild(fragment);
}

function renderIdentity() {
  if (state.displayName) {
    dom.identityName.textContent = state.displayName;
    dom.identityNote.textContent = state.autoJoinEnabled
      ? "已在本设备记住名字，之后进入会自动加入共修。"
      : "已记住这个名字；需要时可手动加入共修。";
    dom.editNameButton.hidden = false;
    dom.joinButton.textContent = state.joined ? "离开本场" : "加入共修";
    return;
  }

  dom.identityName.textContent = "尚未设置名字";
  dom.identityNote.textContent = "第一次输入一次，之后本设备可自动加入共修。";
  dom.editNameButton.hidden = true;
  dom.joinButton.textContent = "输入名字并加入";
}

async function joinPractice(options = {}) {
  if (!state.displayName) {
    return;
  }

  state.joined = true;
  renderIdentity();
  await upsertAttendance();
  startPresence();

  if (!options.auto) {
    dom.audioNote.textContent = `已加入共修：${state.displayName}`;
    dom.audioNote.classList.remove("is-warning");
  }
}

async function leavePractice() {
  stopPresence();
  state.joined = false;
  renderIdentity();
  dom.audioNote.textContent = "你已离开本场共修，名字仍保存在本设备中。";
  dom.audioNote.classList.remove("is-warning");
  await refreshAttendees();
}

function persistIdentity() {
  if (state.displayName) {
    localStorage.setItem("gongxiu:displayName", state.displayName);
  } else {
    localStorage.removeItem("gongxiu:displayName");
  }
  localStorage.setItem("gongxiu:autoJoinAttendance", state.autoJoinEnabled ? "1" : "0");
}

function openNameModal() {
  state.modalOpen = true;
  dom.nameModal.hidden = false;
  dom.modalDisplayName.value = state.displayName;
  dom.rememberJoinToggle.checked = state.autoJoinEnabled;

  window.requestAnimationFrame(() => {
    dom.modalDisplayName.focus();
    dom.modalDisplayName.select();
  });
}

function closeNameModal() {
  state.modalOpen = false;
  dom.nameModal.hidden = true;
}

async function onModalConfirm() {
  const nextName = dom.modalDisplayName.value.trim();
  if (!nextName) {
    dom.modalDisplayName.focus();
    return;
  }

  state.displayName = nextName;
  state.autoJoinEnabled = dom.rememberJoinToggle.checked;
  persistIdentity();
  renderIdentity();
  closeNameModal();
  await joinPractice();
}

function onModalInputKeyDown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    onModalConfirm();
  }
}

function onModalShellClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target.dataset.closeModal === "true") {
    closeNameModal();
  }
}

function onDocumentKeyDown(event) {
  if (event.key === "Escape" && state.modalOpen) {
    closeNameModal();
  }
}

function hasSupabaseConfig() {
  return Boolean(config.supabase?.url && config.supabase?.anonKey && config.supabase?.table);
}

function supabaseHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    apikey: config.supabase.anonKey,
    Authorization: `Bearer ${config.supabase.anonKey}`,
    ...extra,
  };
}

function onBeforeUnload() {
  stopPresence();
}

function getSessionWindow(now = Date.now()) {
  const offsetMs = Number(config.timezoneOffsetMinutes || 480) * 60 * 1000;
  const [hourString = "6", minuteString = "0"] = String(
    config.dailyStart || "06:00"
  ).split(":");
  const targetHour = Number(hourString);
  const targetMinute = Number(minuteString);
  const durationMs = Number(state.sessionDurationSeconds || 0) * 1000;
  const graceMs = Number(config.liveGraceSeconds || 120) * 1000;

  const localNow = new Date(now + offsetMs);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth();
  const date = localNow.getUTCDate();

  const startLocalMs = Date.UTC(year, month, date, targetHour, targetMinute, 0);
  const todayStartUtc = startLocalMs - offsetMs;

  let activeStartUtc = todayStartUtc;
  let nextStartUtc = todayStartUtc + 24 * 60 * 60 * 1000;

  if (now < todayStartUtc) {
    activeStartUtc = todayStartUtc - 24 * 60 * 60 * 1000;
    nextStartUtc = todayStartUtc;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - todayStartUtc) / 1000));
  const isLive =
    now >= todayStartUtc &&
    now <= todayStartUtc + durationMs + graceMs &&
    durationMs > 0;

  return {
    isLive,
    elapsedSeconds,
    countdownMs: Math.max(0, nextStartUtc - now),
    nextStartLabel: formatSessionLabel(nextStartUtc, offsetMs),
    sessionKey: sessionKeyFromUtc(isLive ? todayStartUtc : nextStartUtc, offsetMs),
    activeStartUtc,
  };
}

function sessionKeyFromUtc(timestamp, offsetMs) {
  const local = new Date(timestamp + offsetMs);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSessionLabel(timestamp, offsetMs) {
  const local = new Date(timestamp + offsetMs);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  const hours = String(local.getUTCHours()).padStart(2, "0");
  const minutes = String(local.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes} (${config.timezoneLabel || "UTC+8"})`;
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  const hoursPart = Math.floor(minutesPart / 60);
  const safeMinutes = minutesPart % 60;

  if (hoursPart > 0) {
    return `${String(hoursPart).padStart(2, "0")}:${String(safeMinutes).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}`;
  }

  return `${String(minutesPart).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}`;
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")} 小时 ${String(minutes).padStart(2, "0")} 分 ${String(seconds).padStart(2, "0")} 秒`;
}

function formatRelative(isoString) {
  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  );
  if (diffSeconds < 5) {
    return "刚刚";
  }
  if (diffSeconds < 60) {
    return `${diffSeconds} 秒前`;
  }
  const minutes = Math.floor(diffSeconds / 60);
  return `${minutes} 分钟前`;
}

function getOrCreateClientId() {
  const existing = localStorage.getItem("gongxiu:clientId");
  if (existing) {
    return existing;
  }
  const next = crypto.randomUUID();
  localStorage.setItem("gongxiu:clientId", next);
  return next;
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
