# Queer-AI Rebuild • End-to-End Roadmap  
*(All-OpenAI stack, <2-min video output, solo-dev workflow)*

---

## 📜 Legend & Conventions
| Emoji | Meaning |
|-------|---------|
| 🛠️  | code task |
| 🎨  | prompt / content task |
| 🔗 | external API wiring |
| 🐳 | Docker / infra |
| ✅ | completion criteria checkpoint |

**Branch naming:** `phase-<n>-<slug>` &nbsp;|&nbsp; **Commit style:** `<scope>: <imperative summary>`  
Example: `backend: add gpt-4o-mini prompt builder`.

---

## Phase 0 – Project Bootstrap
### Goals
* Scaffold Next 14 + Tailwind app.
* Commit Dockerfile with Node 20-alpine, `ffmpeg`, `yt-dlp`, and `pnpm`.
* Add Upstash Redis & BullMQ queue skeleton.

### Tasks
1. 🛠️ `npx create-next-app@latest queer-ai --ts --tailwind --eslint`
2. 🐳 Write `Dockerfile`  
   ```Dockerfile
   FROM node:20-alpine
   RUN apk add --no-cache ffmpeg yt-dlp
   WORKDIR /app
   COPY . .
   RUN pnpm install
   CMD ["pnpm","dev"]
   ```
3. 🛠️ Init env vars in `.env.example`.
4. 🔗 Add Upstash Redis URL + BullMQ `videoQueue`.
5. 🛠️ Pre-commit Husky + lint-staged.

### ✅ Done when
* `docker compose up` ⇒ local dev server at `localhost:3000`.
* Empty queue visible in Upstash dashboard.

---

## Phase 1 – Core AI Commentary (Text-only MVP)
### Goals
Generate multi-agent dialogue from a hard-coded transcript snippet.

### Tasks
1. 🛠️ Create `/api/generate` route.
2. 🎨 Build `promptBuilder.ts` with personas & format:
   ```
   FabOne: line
   FabTwo: line
   ```
3. 🔗 Call **OpenAI Responses API** (`gpt-4o-mini`) with dummy frame array `[]` and dummy transcript summary.
4. 🛠️ Parse response → array of `{speaker, text}`.
5. 🛠️ Simple front-end page: textarea for “Transcript (dev only)” + “Generate” button → renders dialogue.

### ✅ Done when
* Input stub transcript, receive ≤280-token dialogue with 3+ labelled speakers.

---

## Phase 2 – Audio API (TTS) Integration
### Goals
Turn the dialogue into a single WAV.

### Tasks
1. 🔗 Loop lines → **OpenAI Audio TTS** (`tts-1`) with `voice=alloy,fable,…`.
2. 🛠️ Write `mergeAudio.ts` using `ffmpeg concat demuxer`.
3. 🛠️ Upload merged WAV to `/public/out.wav` (dev only).
4. 🛠️ Front-end audio player component.

### ✅ Done when
* Clicking *Generate* gives a playable WAV that speaks every line in order, voices match speakers.

---

## Phase 3 – Video Pipeline (≤120 s, Local FFmpeg)
### Goals
Create MP4: muted clips + AI voiceover.

### Tasks
1. 🔗 Use `yt-dlp` to fetch & clip **max 240 s** of source video.
2. 🛠️ Sample frames every 5 s → buffer; store file paths.
3. 🛠️ `ffmpegCompose.ts`  
   ```
   - mute original
   - pad background volume 0.05
   - overlay voice.wav
   - -t <targetLen>
   ```
4. 🐳 Ensure ffmpeg binary works in container.
5. 🛠️ Persist `out.mp4` → Cloudflare R2 (signed URL 24 h).

### ✅ Done when
* Given any YouTube link <10 min, pipeline returns signed MP4 in ≤45 s locally.

---

## Phase 4 – Async Queue & Progress UX
### Goals
Non-blocking UX, visible status.

### Tasks
1. 🛠️ Move heavy work into `worker.ts` (BullMQ consumer).
2. 🔗 API route pushes job → returns `jobId`.
3. 🛠️ `/api/status?id=…` returns `{progress:0-100,url?:string}`.
4. 🛠️ Front-end poll every 2 s → radial progress.

### ✅ Done when
* Browser never times out; progress bar reaches 100 % then auto-plays the video.

---

## Phase 5 – Production Hardening
### Goals
Ship to prod, keep costs & latency predictable.

### Tasks
1. 🛠️ Env-switch OpenAI models:  
   *Default:* `gpt-4o-mini`, `tts-1`  
   *Premium toggle:* `gpt-4o`, `tts-1-hd`
2. 🐳 GitHub Actions → build & push Docker image → Fly.io.
3. 🔗 Budget caps via OpenAI Usage API; abort if >$0.25/job.
4. 🛠️ Sentry for backend + Vercel analytics for front-end.
5. 🐳 Optional Shotstack fallback: if queue lag > 5 jobs, POST edit JSON → poll render URL.

### ✅ Done when
* End-to-end cold start in prod ≤60 s, cost logged ≤$0.15/job.
* Premium path verified with toggle.

---

## Phase 6 – User Management & Monetization (Optional)
### Goals
Auth, credit system, Stripe checkout.

_(Skip until product–market fit proven)_

---

## Appendix A – Cost / Latency Table (per 2-min job)

| Step | Model | $ | sec |
|------|-------|---|-----|
| Vision+Text | gpt-4o-mini | 0.05 | 4 |
| TTS (300 tokens) | tts-1 | 0.005 | 6 |
| Whisper STT | whisper-1 | 0.006 | 4 |
| FFmpeg encode | local CPU | ~0 | 20 |
| **Total** |   | **≈ $0.07** | **~34 s** |

Premium path ~2.3× cost, +4–6 s latency.

---

## Appendix B – `.env.example`
```
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
REDIS_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
```

---

Happy building!  
Tag issues with `🚧` emoji to track blockers, and use GitHub Projects «Phased Board» to drag tasks into *To Do → In Progress → Done*.
]