# aliyasavul.com

Ali Yasavul'un kişisel sitesi: elektro gitar dersleri, session gitar, kayıt ve aranje.

## Siteyi nasıl değiştiririm?

**aliyasavul.com/admin** adresine gir ve **GitHub ile giriş yap**. Bütün yazılar, renkler, yazı tipleri, YouTube videoları, Spotify şarkıları, fotoğraflar, Instagram, iletişim bilgileri ve duyuru bandı oradan değişir. Sağdaki önizlemede değişikliği anında görürsün; **Yayınla**'ya basınca site yaklaşık bir dakika içinde güncellenir.

Her yayın bir sürüm olarak saklanır. Beğenmediğin bir değişikliği panelde **Geçmiş sürümler** bölümünden geri alabilirsin.

Dosyalar en fazla 24 MB olabilir. Fotoğraflar yüklenirken otomatik küçültülür.

## Nasıl çalışıyor?

- `content/site.json`: Sitedeki her şey (yazılar TR/EN, renkler, yazı tipleri, videolar, fotoğraflar). Panel bu dosyayı değiştirir.
- `public/`: Sitenin görsel dosyaları, kodu ve admin paneli. Panelden yüklenen dosyalar `public/uploads/` içine gelir.
- `public/assets/amber/`: 3D kehribar. Taş 120 açıdan render edildi (`c000`–`c119`) ve her açının derinlik haritası `depth.webp` içinde; `public/js/stone.js` bunlarla taşı gerçek zamanlı çevirir. 3D açılamayan cihazlarda `amber.mp4` videosu oynar.
- `src/render.mjs`: `site.json`'u sayfaya çeviren kod (hem yayın sırasında hem tarayıcıda kullanılır).
- `src/worker.js`: GitHub ile giriş ve panelin kaydetme işlemleri (Cloudflare Worker).
- `scripts/build.mjs`: Yayın sırasında Türkçe (`/`) ve İngilizce (`/en/`) sayfaları hazırlar.

Bu depoya her kayıt yapıldığında Cloudflare siteyi kendiliğinden yeniden kurar ve yayınlar (Workers Builds). `site.json` bozuk olursa kurulum durur ve site eski haliyle açık kalır.

## Cloudflare ayarları

Worker adı: `aliyasavul-site`. Gizli değerler (Settings → Variables and Secrets, tür: Secret):

- `GITHUB_CLIENT_ID`: GitHub OAuth uygulamasının Client ID'si
- `GITHUB_CLIENT_SECRET`: aynı uygulamanın Client secret'ı

GitHub OAuth uygulamasının geri dönüş adresi (callback URL): `https://aliyasavul.com/api/auth/callback`

Diğer ayarlar `wrangler.jsonc` içinde.

## Geliştirici notları

No dependencies are needed to build: `node scripts/build.mjs` writes `dist/`. Cloudflare deploys with `npx wrangler deploy`, which runs the same build first. The admin talks to GitHub only through `/api/gh/*`, a proxy in `src/worker.js` that is limited to this repository and its `main` branch; the GitHub token stays in an encrypted HttpOnly cookie.
