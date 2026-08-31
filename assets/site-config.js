window.APP_CONFIG = {
  siteTitle: "皈依共修",
  siteDescription: "每天东八区早上 6:00 开始，同步音频进度、字幕滚动与在线名单。",
  timezoneLabel: "UTC+8",
  timezoneOffsetMinutes: 480,
  dailyStart: "06:00",
  sessionDurationSeconds: 2723,
  liveGraceSeconds: 120,
  heartbeatIntervalMs: 20000,
  attendeeVisibleWindowMs: 90000,
  defaultPracticeVersionId: "badaren",
  lyricsUrl: "./assets/badaren.lrc?v=20260831-1",
  audioUrl: "./assets/audio/badaren.mp3",
  practiceVersions: [
    {
      id: "badaren",
      title: "八大人觉经版",
      subtitle: "皈依共修 · 八大人觉经版仪轨",
      status: "current",
      audioUrl: "./assets/audio/badaren.mp3",
      lyricsUrl: "./assets/badaren.lrc?v=20260831-1",
    },
    {
      id: "guiyi",
      title: "皈依共修",
      subtitle: "标准皈依共修仪轨（五戒版）",
      status: "available",
      audioUrl: "./assets/audio/guiyi.mp3",
      lyricsUrl: "./assets/guiyi.lrc",
    },
  ],
  supabase: {
    url: "https://xnhzasdhvflvloncdknr.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuaHphc2RodmZsdmxvbmNka25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTE5NzAsImV4cCI6MjA4ODk2Nzk3MH0.XTDvRHMwbjayhAvf0WKwSaZ_Ri4Q0ckA1Y6Y1H0rZbs",
    table: "attendees",
  },
};
