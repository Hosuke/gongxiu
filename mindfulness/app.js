"use strict";

const practices = [
  {
    title: "正念起床",
    label: "第一处 · 清晨",
    description: "从睁眼与起身开始，回到身体和呼吸。",
    duration: 334.32,
    audioUrl: "../assets/audio/mindfulness/waking-up.mp3",
  },
  {
    title: "正念洗漱",
    label: "第二处 · 盥洗",
    description: "让水声、触感与每个动作成为觉知的提醒。",
    duration: 297.696,
    audioUrl: "../assets/audio/mindfulness/washing-up.mp3",
  },
  {
    title: "正念为食",
    label: "第三处 · 一餐",
    description: "家庭版。于一餐之间，看见食物的来处与彼此。",
    duration: 602.881,
    audioUrl: "../assets/audio/mindfulness/mindful-eating-family.m4a",
  },
  {
    title: "正念洗碗",
    label: "第四处 · 餐后",
    description: "安住于重复的动作，不急着赶往下一件事。",
    duration: 338.88,
    audioUrl: "../assets/audio/mindfulness/washing-dishes.mp3",
  },
  {
    title: "正念打扫",
    label: "第五处 · 洒扫",
    description: "扫去尘埃，也照见当下；含磬声引导。",
    duration: 633.861,
    audioUrl: "../assets/audio/mindfulness/cleaning.mp3",
  },
];

const dom = {};
let activePracticeIndex = restorePracticeIndex();

document.addEventListener("DOMContentLoaded", initMindfulnessPage);

function initMindfulnessPage() {
  dom.audio = document.querySelector("#mindfulness-audio");
  dom.cards = [...document.querySelectorAll("[data-practice-index]")];
  dom.nowLabel = document.querySelector("#mindfulness-now-label");
  dom.title = document.querySelector("#mindfulness-player-title");
  dom.description = document.querySelector("#mindfulness-player-description");
  dom.playButton = document.querySelector("#mindfulness-play-button");
  dom.restartButton = document.querySelector("#mindfulness-restart-button");
  dom.progress = document.querySelector("#mindfulness-progress-range");
  dom.currentTime = document.querySelector("#mindfulness-current-time");
  dom.durationTime = document.querySelector("#mindfulness-duration-time");
  dom.status = document.querySelector("#mindfulness-status");

  dom.cards.forEach((card) => {
    card.addEventListener("click", () => {
      const index = Number(card.dataset.practiceIndex);
      selectPractice(index, true);
    });
  });

  dom.playButton.addEventListener("click", togglePlayback);
  dom.restartButton.addEventListener("click", restartPractice);
  dom.progress.addEventListener("input", seekPractice);
  dom.audio.addEventListener("loadedmetadata", updateDuration);
  dom.audio.addEventListener("timeupdate", updateProgress);
  dom.audio.addEventListener("play", renderPlayingState);
  dom.audio.addEventListener("pause", renderPausedState);
  dom.audio.addEventListener("ended", renderCompletedState);
  dom.audio.addEventListener("error", renderAudioError);

  selectPractice(activePracticeIndex, false);
}

function restorePracticeIndex() {
  const stored = Number(localStorage.getItem("gongxiu:mindfulnessPractice"));
  return Number.isInteger(stored) && stored >= 0 && stored < practices.length ? stored : 0;
}

function selectPractice(index, shouldPlay) {
  if (!Number.isInteger(index) || index < 0 || index >= practices.length) {
    return;
  }

  activePracticeIndex = index;
  const practice = practices[index];

  dom.audio.pause();
  dom.audio.src = practice.audioUrl;
  dom.audio.load();
  dom.nowLabel.textContent = practice.label;
  dom.title.textContent = practice.title;
  dom.description.textContent = practice.description;
  dom.currentTime.textContent = "00:00";
  dom.durationTime.textContent = formatTime(practice.duration, true);
  dom.progress.max = String(Math.round(practice.duration * 10));
  dom.progress.value = "0";
  dom.playButton.textContent = "开始练习";
  dom.status.textContent = shouldPlay
    ? `正在准备「${practice.title}」…`
    : "准备好时，轻轻按下“开始练习”。";

  dom.cards.forEach((card, cardIndex) => {
    const isActive = cardIndex === index;
    card.classList.toggle("is-active", isActive);
    card.setAttribute("aria-pressed", String(isActive));
    const action = card.querySelector(".mindfulness-card-action");
    if (action) {
      action.textContent = isActive ? "当前" : "开始";
    }
  });

  localStorage.setItem("gongxiu:mindfulnessPractice", String(index));

  if (shouldPlay) {
    playPractice();
  }
}

async function togglePlayback() {
  if (dom.audio.paused) {
    if (dom.audio.ended) {
      dom.audio.currentTime = 0;
    }
    await playPractice();
    return;
  }
  dom.audio.pause();
}

async function playPractice() {
  try {
    await dom.audio.play();
  } catch (error) {
    console.error(error);
    dom.status.textContent = "浏览器尚未允许播放，请再轻触一次“开始练习”。";
  }
}

function restartPractice() {
  dom.audio.currentTime = 0;
  playPractice();
}

function seekPractice() {
  dom.audio.currentTime = Number(dom.progress.value) / 10;
  updateProgress();
}

function updateDuration() {
  const fallback = practices[activePracticeIndex].duration;
  const duration = Number.isFinite(dom.audio.duration) ? dom.audio.duration : fallback;
  dom.progress.max = String(Math.round(duration * 10));
  dom.durationTime.textContent = formatTime(duration, true);
}

function updateProgress() {
  const current = Number.isFinite(dom.audio.currentTime) ? dom.audio.currentTime : 0;
  dom.progress.value = String(Math.round(current * 10));
  dom.currentTime.textContent = formatTime(current);
}

function renderPlayingState() {
  dom.playButton.textContent = "暂停片刻";
  dom.status.textContent = `正在练习「${practices[activePracticeIndex].title}」。`;
  document.body.classList.add("mindfulness-is-playing");
}

function renderPausedState() {
  if (dom.audio.ended) {
    return;
  }
  dom.playButton.textContent = dom.audio.currentTime > 0 ? "继续练习" : "开始练习";
  dom.status.textContent = dom.audio.currentTime > 0
    ? "已暂停。准备好时，从这一念继续。"
    : "准备好时，轻轻按下“开始练习”。";
  document.body.classList.remove("mindfulness-is-playing");
}

function renderCompletedState() {
  dom.playButton.textContent = "再练一次";
  dom.status.textContent = "这一处练习已经圆满。愿这份觉知继续留在眼前的日常。";
  document.body.classList.remove("mindfulness-is-playing");
}

function renderAudioError() {
  dom.status.textContent = "音频暂时无法载入，请稍后重试。";
  dom.playButton.textContent = "重新载入";
  document.body.classList.remove("mindfulness-is-playing");
}

function formatTime(value, shouldRound = false) {
  const numericValue = Number(value) || 0;
  const totalSeconds = Math.max(0, shouldRound ? Math.round(numericValue) : Math.floor(numericValue));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
