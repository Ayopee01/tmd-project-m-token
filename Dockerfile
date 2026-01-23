# Dockerfile

# --- Stage 1: Install dependencies ---
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files เพื่อลง dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# --- Stage 2: Build the app ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# สร้างไฟล์ Production (จะใช้ Environment Variables จากเครื่อง Server ตอน run)
RUN npm run build

# --- Stage 3: Production Runner ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# ตั้งค่า Port ให้ตรงกับที่คุณต้องการ (3005)
ENV PORT 3005
ENV HOSTNAME "0.0.0.0"

# สร้าง User ใหม่เพื่อความปลอดภัย (ไม่ใช้ Root)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy ไฟล์ที่จำเป็นจากขั้นตอน Build (สำหรับโหมด standalone)
COPY --from=builder /app/public ./public
# สังเกต: ต้อง Copy โฟลเดอร์ .next/standalone มาเป็น root ของ app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3005

# สั่งรัน server.js (ไฟล์ที่ Next.js สร้างให้ในโหมด standalone)
CMD ["node", "server.js"]