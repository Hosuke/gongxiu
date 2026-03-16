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
  practiceVersions: [
    {
      id: "guiyi",
      title: "皈依共修",
      subtitle: "当前开放版本，可直接进入共修。",
      status: "current",
    },
    {
      id: "morning-lite",
      title: "早课简版",
      subtitle: "更短时长版本，后续会上线。",
      status: "coming",
    },
    {
      id: "morning-full",
      title: "早课完整版",
      subtitle: "适合完整早课流程，后续会上线。",
      status: "coming",
    },
  ],
  supabase: {
    url: "https://YOUR_PROJECT.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY",
    table: "attendees",
  },
};
