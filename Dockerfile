FROM node:20-alpine
RUN apk add --no-cache ffmpeg yt-dlp

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app
COPY . .
RUN pnpm install
CMD ["pnpm","dev"] 