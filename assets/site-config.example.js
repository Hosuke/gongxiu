window.APP_CONFIG = {
  siteTitle: "皈依共修",
  siteDescription: "每天东八区早上 6:00 开始，同步音频进度、字幕滚动与在线名单。",
  timezoneLabel: "UTC+8",
  timezoneOffsetMinutes: 480,
  dailyStart: "06:00",
  sessionDurationSeconds: 1919,
  liveGraceSeconds: 120,
  heartbeatIntervalMs: 20000,
  attendeeVisibleWindowMs: 90000,
  lyricsUrl: "./assets/guiyi.lrc",
  audioUrl: "./assets/audio/guiyi.mp3",
  supabase: {
    url: "https://YOUR_PROJECT.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY",
    table: "attendees",
  },
};
