/**
 * Maktab va sinf guruhlarini reklama, spam va begona havolalardan tozalovchi vosita
 */

export function isAdvertisementMessage(message) {
  if (!message) return { isAd: false };

  const text = message.text || message.caption || '';
  
  // Bot buyruqlariga (masalan: /darsjadvali, /kod, /start) tegilmaydi
  if (text.trim().startsWith('/')) {
    return { isAd: false };
  }

  // 1. Telegram Entities ichida URL yoki Text Link bormi?
  const entities = message.entities || message.caption_entities || [];
  for (const ent of entities) {
    if (ent.type === 'url' || ent.type === 'text_link') {
      return { isAd: true, reason: 'Havola (link)' };
    }
  }

  // 2. Matn ichida Telegram yoki veb havolalar bormi?
  const linkRegex = /(https?:\/\/|t\.me\/|telegram\.me\/|t\.me\/\+|joinchat|bit\.ly|telegra\.ph)/i;
  if (linkRegex.test(text)) {
    return { isAd: true, reason: 'Telegram / Web havola' };
  }

  // 3. Kanallar va boshqa guruhlardan forward qilingan xabarlar
  if (message.forward_origin || message.forward_from_chat || message.forward_from) {
    const originType = message.forward_origin?.type;
    if (originType === 'channel' || originType === 'chat' || message.forward_from_chat) {
      return { isAd: true, reason: 'Kanaldan forward' };
    }
  }

  // 4. Reklama, qimor, stavka, pul ishlash va spam kalit so'zlari
  const spamKeywords = [
    'pul ishlash', 'daromad', '1xbet', 'linebet', 'melbet', 'mostbet', 'stavka',
    'kripto', 'notcoin', 'hamster', 'kanalga obuna', 'obuna bo‘ling', 'obuna boling',
    'obuna buling', 'kanalga a‘zo', 'kanalga azo', 'kanalga qo‘shiling', 'kanalga qoshiling',
    'sotiladi', 'arzon narx', 'skidka', 'aksiya', 'intim', 'kazinolar', 'kazino',
    'aloqaga chiqing', 'telegram premium bepul', 'bot orqali pul'
  ];

  const lower = text.toLowerCase();
  for (const kw of spamKeywords) {
    if (lower.includes(kw)) {
      return { isAd: true, reason: `Spam so‘z (${kw})` };
    }
  }

  return { isAd: false };
}
