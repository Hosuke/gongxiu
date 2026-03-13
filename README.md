# 皈依共修网页

这是一个可直接放到 GitHub Pages 的静态网页原型，包含：

- 音频播放
- 字幕按时间轴滚动
- 每天东八区 `06:00` 的共修倒数
- 已开播后按“当天直播进度”同步
- 名字 / 法名登记
- 接上 Supabase 后显示在线人数与在线名单

## 目录

- `index.html`: 页面结构
- `styles.css`: 视觉样式
- `app.js`: 播放、字幕、倒数、在线名单逻辑
- `assets/guiyi.lrc`: 字幕时间轴
- `assets/site-config.js`: 页面配置

## GitHub Pages 可行性

可行，但有两个边界必须接受：

1. `GitHub Pages` 只能托管静态文件，不能单独提供“在线人数 / 在线名单”的存储。
2. 浏览器不允许对完全无交互的新访客强制自动播放音频，所以“每天 6 点自动开始”只适合已经打开页面、且该浏览器之前做过一次交互的用户。

换句话说：

- 页面、字幕、定时开播倒数：`GitHub Pages` 可以。
- 在线名单：需要额外接一个后端服务，推荐 `Supabase`。
- 6 点自动开播：对“已打开且已解锁播放”的页面可以做，对“用户 6 点才第一次打开页面”不能保证无感自动播。

## 本地运行

不要直接双击 `index.html`，因为字幕文件通过 `fetch()` 读取。

在项目根目录执行：

```bash
python3 -m http.server 4173
```

然后打开：

```text
http://localhost:4173
```

## 音频配置

默认配置指向：

```text
./assets/audio/guiyi.mp3
```

请把你的音频文件放到这个路径，或者直接改 `assets/site-config.js` 里的 `audioUrl` 为你自己的 `HTTPS` 地址。

如果你部署在 `https://<user>.github.io/...`，音频也必须是 `HTTPS`，不能用 `HTTP`，否则浏览器会拦截混合内容。

## 在线名单配置

编辑 [assets/site-config.js](/Users/hosuke/Connector/AGentic/gongxiu/assets/site-config.js)：

```js
supabase: {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
  table: "attendees",
}
```

然后在 Supabase SQL Editor 建表：

```sql
create table public.attendees (
  client_id text not null,
  session_id text not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (client_id, session_id)
);

alter table public.attendees enable row level security;

create policy "anon can read attendees"
on public.attendees
for select
to anon
using (true);

create policy "anon can insert attendees"
on public.attendees
for insert
to anon
with check (true);

create policy "anon can update attendees"
on public.attendees
for update
to anon
using (true)
with check (true);
```

页面逻辑会每隔一段时间写入一次 `last_seen`，并把 `90` 秒内仍有心跳的人视为在线。

## 部署到 GitHub Pages

1. 把仓库推到 GitHub。
2. 在仓库 `Settings > Pages` 里启用 GitHub Pages。
3. 选择从当前分支发布。
4. 确保 `assets/site-config.js`、字幕文件、音频文件都已提交。

## 后续可继续加的功能

- 区分“主持人开播”和“参与者跟播”
- 房间留言 / 回向留言
- 管理员上传新音频后自动替换字幕
- PWA 安装到手机桌面
- 打开页面时自动跳到“今天的场次”
