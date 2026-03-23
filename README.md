# Beauty by Bugi

Astro verzija stranice za Beauty by Bugi s Decap CMS-om i Cloudflare Pages deployom.

## Razvoj

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

Astro 6 traži Node `22.12.0+`, a GitHub Actions je već podešen na Node 24.

## Sadržaj

- Osnovni sadržaj: `src/content/settings/site.yml`
- Cjenik: `src/content/pricing/cjenik.yml`
- Galerija: `src/content/gallery/radovi.yml`
- Admin: `/admin`

## Deploy

GitHub Actions na svakom pushu na `main` radi:

1. `npm ci`
2. `npm run build`
3. `wrangler pages deploy dist`

## CMS auth proxy

Za Decap GitHub login treba OAuth proxy worker iz foldera `cms-auth/`.
Trenutni worker URL je `https://beauty-by-bugi-cms-auth.filipbugarin.workers.dev`.

Osnovni koraci:

1. Deploy proxy:
   `npx wrangler deploy --config cms-auth/wrangler.jsonc`
2. Na GitHubu napravi OAuth App.
3. Kao `Homepage URL` stavi URL worker-a.
4. Kao `Authorization callback URL` stavi `WORKER_URL/callback`.
5. Dodaj Cloudflare worker secret `GITHUB_OAUTH_ID`.
6. Dodaj Cloudflare worker secret `GITHUB_OAUTH_SECRET`.
