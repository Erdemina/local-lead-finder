# Local Lead Finder

[English](README.md) · **Türkçe**

Web sitesi olmayan — ya da sitesi bozuk olan — yerel işletmeleri bulun ve
çalışan bir satış hattına dönüştürün. OpenStreetMap üzerinden kategori ve bölge
ile arayın, her sonucun site sağlığını kontrol edin, isterseniz sonuçları bir
LLM ile skorlayıp notlandırın; ardından elemeyi geçenleri notlar, aşamalar,
Excel gidiş-dönüşü ve üretilen demo sitelerle aday olarak yönetin.

Yerel işletmelere web sitesi ve dijital hizmet satan ajanslar ve serbest
çalışanlar için yazıldı. Kendi sunucunuzda çalışır; faturalama, plan limiti
veya dış SaaS bağımlılığı yoktur.

## Özellikler

- 🗺️ **Kategori + bölge araması** — OpenStreetMap Overpass, API anahtarı gerektirmez
- 🩺 **Site sağlığı kontrolü** — her sonucu sağlam, bozuk, park edilmiş veya yok olarak sınıflar
- 🤖 **AI araması ve skorlama** *(opsiyonel)* — Anthropic Claude veya OpenRouter; web aramasıyla Overpass'ta bulunmayan işletmeleri keşfeder ve her adayın ne kadar umut verici olduğunu puanlar
- 🇹🇷 **Türkiye geneli tarama** — il başına bir arka plan taraması kuyruğa alınır, tüm parti tek bir çalışma kitabı olarak dışa aktarılır
- 👥 **Aday hattı** — aşamalar, notlar, iletişim alanları, toplu işlemler
- 📊 **Excel gidiş-dönüşü** — açılır liste ve kilitli hücrelerle dışa aktarım, çevrimdışı düzenleme, yazmadan önce önizlemeli içe aktarım
- 🌐 **Demo site üretimi** — bir aday için şablon tabanlı demo site üretilir ve kendi slug'ı üzerinden sunulur
- 🔐 **Kullanıcılar ve çalışma alanları** — süper admin, çalışma alanı sahipleri ve üyeler
- 🗄️ **KVKK saklama** — çalışma alanı başına saklama süresi; süresi dolan adaylar otomatik silinir

## Mimari

```
                       ┌─────────────────────────┐
   Tarayıcı ──:3000──▶ │  Next.js 14 (App Router)│
                       │  server component +     │
                       │  route handler          │
                       └───────────┬─────────────┘
                                   │ kuyruğa at (BullMQ)
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
       ┌────────────┐       ┌────────────┐    ┌──────────────────────┐
       │ PostgreSQL │       │   Redis    │◀──▶│  Worker              │
       │   :5432    │       │   :6379    │    │  tarama, site üretimi│
       └────────────┘       └────────────┘    │  sağlık, saklama     │
                                              └──────────┬───────────┘
                                                         │ yazar
                                                         ▼
                                              ┌──────────────────────┐
   Tarayıcı ──:8080─────────────────────────▶ │ nginx (demo siteler) │
                                              └──────────────────────┘
```

Dış servisler: **Overpass** (işletme verisi), **Nominatim** (koordinat çözümleme)
ve opsiyonel olarak AI araması/skorlama için **Anthropic** veya **OpenRouter**.

### Klasör yapısı

```
local-lead-finder/
├── app/
│   ├── app/          # kullanıcı ekranları (arama, tarama, adaylar, aksiyonlar, ayarlar)
│   ├── admin/        # süper admin ekranları (çalışma alanları, veri kaynakları, siteler, denetim)
│   ├── api/          # route handler'lar
│   └── _components/  # özellik bileşenleri
├── lib/
│   ├── discovery/    # kaynak adaptörleri (Overpass, AI araması) + arama motoru
│   ├── ai/           # sağlayıcı soyutlaması (Anthropic / OpenRouter)
│   ├── health/       # site sağlığı kontrolcüsü
│   ├── excel/        # dışa ve içe aktarımın paylaştığı çalışma kitabı tanımı
│   └── queue/        # BullMQ kuyrukları ve iş tipleri
├── worker/           # arka plan iş işleyicileri
├── prisma/           # şema + migration'lar
└── scripts/          # seed
```

## Gereksinimler

- [Docker](https://docs.docker.com/get-docker/) 20.10+ ve Compose v2
- Docker'sız yerel geliştirme için: Node.js 20+, Yarn, bir PostgreSQL 16 ve bir Redis

## Kurulum

```bash
cp .env.example .env      # gizli değerleri doldurun — aşağıdaki tabloya bakın
docker compose up --build
```

Migration'lar uygulama açılmadan önce otomatik çalışır. Veri kaynaklarını ve ilk
yönetici hesabını oluşturmak için:

```bash
docker compose exec worker node_modules/.bin/tsx scripts/seed.ts
```

Uygulama <http://localhost:3000>, üretilen demo siteler
<http://localhost:8080> adresinde olur. `ADMIN_USERNAME` / `ADMIN_PASSWORD` ile
giriş yapın.

### Yerel geliştirme

```bash
yarn install
yarn prisma migrate deploy
yarn dev
yarn worker        # ikinci bir kabukta — arka plan işleri
```

## Ortam değişkenleri

| Değişken | Zorunlu | Nedir | Nereden alınır |
|---|---|---|---|
| `DATABASE_URL` | evet | PostgreSQL bağlantı adresi | Kendi Postgres'iniz; compose bunu `POSTGRES_*` değerlerinden kurar |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | evet | Pakete dahil Postgres konteynerinin kimlik bilgileri | Kendiniz belirlersiniz |
| `REDIS_URL` | evet | İş kuyruğu için Redis adresi | Pakete dahil konteyner: `redis://redis:6379` |
| `NEXTAUTH_URL` | evet | Uygulamanın herkese açık adresi | Örn. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | evet | Oturum imzalama anahtarı | `openssl rand -base64 32` |
| `SECRETS_MASTER_KEY` | evet | Sağlayıcı API anahtarlarını veritabanında şifreleyen AES-256-GCM anahtarı | `openssl rand -base64 32` |
| `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` | evet | Seed'in oluşturup her çalıştığında senkronladığı ilk süper admin hesabı | Kendiniz belirlersiniz |
| `ADMIN_NAME` | hayır | Bu hesabın görünen adı | Varsayılan `Admin` |
| `APP_PORT` | hayır | Uygulamanın yayınlandığı host portu | Varsayılan `3000` |
| `SITES_OUTPUT_DIR` | evet | Worker'ın demo siteleri yazdığı dizin (konteyner içi yol) | Varsayılan `/data/websites` |
| `SITES_HOST_DIR` | hayır | Bu siteler için bağlanan host dizini | Varsayılan `./data/websites` |
| `PUBLIC_SITES_BASE_URL` | evet | Üretilen sitelerin sunulduğu herkese açık adres | Örn. `http://localhost:8080` |
| `NOMINATIM_USER_AGENT` | evet | İletişim bilgisi içeren tanımlayıcı User-Agent | [Nominatim kullanım politikası](https://operations.osmfoundation.org/policies/nominatim/) zorunlu kılar |
| `ANTHROPIC_API_KEY` | hayır | AI araması/skorlaması için yerel geliştirme yedeği | <https://console.anthropic.com> |
| `OPENROUTER_API_KEY` | hayır | Yerel geliştirme yedeği, alternatif sağlayıcı | <https://openrouter.ai/keys> |

Normal kullanımda AI anahtarları `.env`'de **tutulmaz**. Bunları
**Yönetim › Veri Kaynakları** ekranından girin; `SECRETS_MASTER_KEY` ile
şifrelenip veritabanına yazılır ve hiçbir ekranda geri gösterilmez.

## Veri kaynakları ve kullanım koşulları

Overpass ve Nominatim ücretsiz ve anahtarsızdır, ancak ikisinin de bu projenin
uyduğu kullanım politikaları vardır (saniyede 1 istek, tanımlayıcı User-Agent).
Büyük taramalar yapacaksanız kendi Overpass sunucunuzu barındırmayı düşünün.
AI ile keşfedilen sonuçlar bir dil modelinden gelir; kimseyle iletişime
geçmeden önce **mutlaka doğrulanmalıdır**.

## Testler

```bash
yarn vitest run
```

## Lisans

[MIT](LICENSE)
