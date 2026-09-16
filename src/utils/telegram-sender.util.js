import { logger } from './logger.js';

/**
 * Telegram xabarlarini 4000 belgidan oshmagan bo'laklarga xavfsiz ajratish
 * HTML teglarini buzmasdan to'g'ri bo'laklaydi.
 */
export function splitTelegramMessage(text, maxLength = 3900) {
  if (!text || typeof text !== 'string') return [];
  if (text.length <= maxLength) return [text];

  const chunks = [];
  // Bo'laklash uchun ustuvor chegaralar: 1) \n\n (paragraf / kun), 2) \n (qator), 3) probel
  const paragraphs = text.split('\n\n');
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // Agar bitta paragrafning o'zi juda uzun bo'lsa, qatorlarga ajratamiz
    if (paragraph.length > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      const lines = paragraph.split('\n');
      for (const line of lines) {
        if (line.length > maxLength) {
          // Juda uzun qatorni so'zma-so'z bo'lamiz
          const words = line.split(' ');
          for (const word of words) {
            if ((currentChunk + ' ' + word).length > maxLength) {
              if (currentChunk.trim()) chunks.push(currentChunk.trim());
              currentChunk = word;
            } else {
              currentChunk = currentChunk ? currentChunk + ' ' + word : word;
            }
          }
        } else {
          if ((currentChunk + '\n' + line).length > maxLength) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = line;
          } else {
            currentChunk = currentChunk ? currentChunk + '\n' + line : line;
          }
        }
      }
    } else {
      const candidate = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
      if (candidate.length > maxLength) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk = candidate;
      }
    }
  }

  if (currentChunk && currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Xabarni xavfsiz yuborish (agar uzun bo'lsa bo'laklab yuboradi)
 */
export async function replySafely(ctx, text, extra = {}) {
  if (!text || text.trim() === '') {
    return ctx.reply('ℹ️ Ma\'lumot topilmadi.', extra);
  }

  const chunks = splitTelegramMessage(text, 3900);
  if (chunks.length === 1) {
    return ctx.reply(chunks[0], { parse_mode: 'HTML', ...extra });
  }

  const sentMessages = [];
  for (let i = 0; i < chunks.length; i++) {
    // Tugmalarni faqat oxirgi xabarga qo'shish
    const messageExtra = {
      parse_mode: 'HTML',
      ...(i === chunks.length - 1 ? extra : {})
    };
    try {
      const sent = await ctx.reply(chunks[i], messageExtra);
      sentMessages.push(sent);
    } catch (err) {
      logger.error(`[TELEGRAM SENDER] Bo'laklangan xabarni yuborishda xatolik (bo'lak ${i + 1}/${chunks.length}):`, err);
    }
  }
  return sentMessages[0];
}

/**
 * Inline callback query da xabarni xavfsiz tahrirlash yoki bo'laklab yuborish
 */
export async function editOrReplySafely(ctx, text, extra = {}) {
  if (!text || text.trim() === '') {
    return ctx.editMessageText('ℹ️ Ma\'lumot topilmadi.', extra);
  }

  const chunks = splitTelegramMessage(text, 3900);

  if (chunks.length === 1) {
    try {
      return await ctx.editMessageText(chunks[0], { parse_mode: 'HTML', ...extra });
    } catch (err) {
      // Agar xabar o'zgarmagan bo'lsa xatoni e'tiborsiz qoldiramiz
      if (err.message && err.message.includes('message is not modified')) {
        return;
      }
      // Boshqa holatda reply sifatida yuborish
      return ctx.reply(chunks[0], { parse_mode: 'HTML', ...extra });
    }
  }

  // Agar matn uzun bo'lsa: 1-bo'lakni tahrirlaymiz, qolganlarini yangi xabar qilib yuboramiz
  try {
    await ctx.editMessageText(chunks[0], { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply(chunks[0], { parse_mode: 'HTML' });
  }

  for (let i = 1; i < chunks.length; i++) {
    const messageExtra = {
      parse_mode: 'HTML',
      ...(i === chunks.length - 1 ? extra : {})
    };
    try {
      await ctx.reply(chunks[i], messageExtra);
    } catch (err) {
      logger.error(`[TELEGRAM SENDER] Bo'laklangan xabarni yuborishda xatolik (bo'lak ${i + 1}/${chunks.length}):`, err);
    }
  }
}
