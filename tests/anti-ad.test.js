import test from 'node:test';
import assert from 'node:assert';
import { isAdvertisementMessage } from '../src/utils/anti-ad.util.js';

test('Anti-Ad: aniq havolali xabarlarni reklama deb aniqlaydi', () => {
  // Telegram link
  assert.strictEqual(isAdvertisementMessage({ text: 'Bizning kanalimiz: https://t.me/super_kanal' }).isAd, true);
  assert.strictEqual(isAdvertisementMessage({ text: 'Guruhga kiring: t.me/+abcdef123' }).isAd, true);
  
  // Veb havola
  assert.strictEqual(isAdvertisementMessage({ text: 'Arzon kiyimlar bu yerda: http://shop.uz' }).isAd, true);
  
  // Entity url
  const withEntity = {
    text: 'Ajoyib bot',
    entities: [{ type: 'url', offset: 0, length: 10 }]
  };
  assert.strictEqual(isAdvertisementMessage(withEntity).isAd, true);
});

test('Anti-Ad: Kanaldan forward qilingan xabarlarni reklama deb aniqlaydi', () => {
  const forwardedFromChannel = {
    text: 'Yangi aksiya!',
    forward_origin: { type: 'channel', chat: { title: 'Kanal' } }
  };
  assert.strictEqual(isAdvertisementMessage(forwardedFromChannel).isAd, true);
});

test('Anti-Ad: Stavka, pul ishlash va qimor spam so‘zlarini aniqlaydi', () => {
  assert.strictEqual(isAdvertisementMessage({ text: 'Kunda 100 ming so‘m pul ishlash oson!' }).isAd, true);
  assert.strictEqual(isAdvertisementMessage({ text: '1xbet promokod bonus oling' }).isAd, true);
  assert.strictEqual(isAdvertisementMessage({ text: 'Kanalga obuna bo‘ling do‘stlar' }).isAd, true);
});

test('Anti-Ad: Oddiy xabarlar va bot buyruqlarini reklama deb hisoblamaydi', () => {
  assert.strictEqual(isAdvertisementMessage({ text: 'Salom, ertaga 3-soat qaysi dars?' }).isAd, false);
  assert.strictEqual(isAdvertisementMessage({ text: '11-D dars jadvali qachon chiqadi?' }).isAd, false);
  assert.strictEqual(isAdvertisementMessage({ text: '/darsjadvali' }).isAd, false);
  assert.strictEqual(isAdvertisementMessage({ text: '/sinf 11-D' }).isAd, false);
  assert.strictEqual(isAdvertisementMessage({ text: 'Ustoz, bugun 4-dars bormi?' }).isAd, false);
});
