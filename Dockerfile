FROM node:20-alpine

# Ishchi katalog
WORKDIR /app

# SQLite uchun zarur kutubxona va vositalar
RUN apk add --no-cache python3 make g++ sqlite

# Bog'liqliklar fayllari
COPY package*.json ./

# Paketlarni o'rnatish
RUN npm install --omit=dev

# Kodlarni nusxalash
COPY . .

# Ma'lumotlar bazasi papkasini yaratish
RUN mkdir -p /app/data /app/logs

# Port
EXPOSE 3000

# Standart atrof-muhit o'zgaruvchilari
ENV NODE_ENV=production
ENV TZ=Asia/Tashkent
ENV PORT=3000

# Ishga tushirish buyrug'i
CMD ["node", "src/index.js"]
