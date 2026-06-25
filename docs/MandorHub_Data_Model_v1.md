# MandorHub — Data Model v1

> Fondasi skema untuk MVP. Keputusan arsitektur yang sudah dikunci:
> - **Internal dulu, SaaS nanti** → `org_id` ada di semua tabel inti, tapi tenant-isolation belum diaktifkan.
> - **PWA + Capacitor** → ID dibuat di client (UUID) supaya draft offline punya ID stabil sebelum sync.
> - **Server-trust** → waktu & GPS yang dipercaya = yang divalidasi server, bukan dari HP.
> - **Immutability** → `daily_report` & `evidence` terkunci setelah submit. Koreksi = record baru.
>
> Target DB: **PostgreSQL + PostGIS** (untuk validasi radius GPS).

---

## 0. Konvensi global

| Aturan | Detail |
|---|---|
| Primary key | `UUID` (`gen_random_uuid()`), **boleh dibuat di client** untuk offline draft. |
| Multi-tenant | Setiap tabel inti punya `org_id UUID NOT NULL` → FK ke `organization`. Untuk fase internal, hanya ada 1 baris organization. Index `(org_id, ...)` disiapkan dari awal. |
| Waktu tepercaya | Kolom `*_server_at` di-set **server** (`DEFAULT now()`), tidak pernah dari client. Kolom `*_client_at` opsional, hanya referensi. |
| Soft delete | `deleted_at timestamptz NULL`. Tidak ada hard delete pada data lapangan (untuk audit). |
| Enum | Disimpan sebagai `text` + `CHECK` (lebih gampang migrasi daripada native enum). |
| Timestamp | Semua `timestamptz`. |

---

## 1. Entitas inti

### `organization` (tenant / kontraktor)
Untuk fase internal cuma 1 baris. Ada sekarang supaya nanti tinggal "dinyalakan".

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| name | text NOT NULL | Nama usaha kontraktor |
| owner_user_id | UUID | FK → user (diisi setelah user dibuat) |
| created_at | timestamptz | DEFAULT now() |

### `user`
Login via **OTP nomor HP** (bukan password — persona gaptek 40–65 thn).

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| org_id | UUID NOT NULL | FK → organization |
| name | text NOT NULL | |
| phone | text NOT NULL | Identitas login OTP. `UNIQUE (org_id, phone)` |
| role | text NOT NULL | CHECK in (`contractor`, `mandor`, `admin`) |
| is_active | bool | DEFAULT true |
| created_at | timestamptz | |

- `contractor` = Pak Hadi (lihat semua, ambil keputusan).
- `mandor` = Pak Slamet (cuma lihat site yang ditugaskan).
- `admin` = bisa set target & kelola data (boleh = kontraktor sendiri di fase awal).

### `project`

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| org_id | UUID NOT NULL | |
| name | text NOT NULL | "Ruko Pak Budi" |
| client_name | text | |
| address_short | text | |
| status | text | CHECK in (`active`, `paused`, `done`) DEFAULT `active` |
| start_date | date | |
| target_end_date | date | |
| created_by | UUID | FK → user |
| created_at | timestamptz | |

### `site` (Titik)
Satu project → banyak titik. Punya koordinat untuk validasi GPS evidence.

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| org_id | UUID NOT NULL | |
| project_id | UUID NOT NULL | FK → project |
| name | text NOT NULL | "Titik C" |
| address | text | |
| geo | geography(Point,4326) | PostGIS — lokasi titik (opsional) |
| geo_radius_m | int | DEFAULT 150. Toleransi jarak untuk `gps_validated` |
| assigned_mandor_id | UUID | FK → user (role=mandor) |
| created_at | timestamptz | |

### `target` — ⚠️ ENTITAS YANG HILANG DI PROPOSAL CHATGPT
Workflow step-1 "tentukan target" & field "target tercapai/belum" butuh tabel ini. Tanpa ini, target cuma teks bebas yang tak bisa di-track.

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| org_id | UUID NOT NULL | |
| site_id | UUID NOT NULL | FK → site |
| title | text NOT NULL | "Pasang keramik lantai 1" |
| description | text | |
| period_type | text | CHECK in (`daily`, `weekly`) DEFAULT `daily` |
| due_date | date | |
| status | text | CHECK in (`pending`, `in_progress`, `done`, `blocked`) DEFAULT `pending` |
| created_by | UUID | FK → user |
| created_at | timestamptz | |

> P1 "Tugas mingguan" cukup dilayani entitas yang sama dengan `period_type='weekly'`. Tidak perlu tabel baru.

### `daily_report` — 🔒 IMMUTABLE setelah submit
Laporan 2 menit dari mandor. Kunci kepercayaan: terkunci setelah `submitted`.

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | Dibuat di client (offline draft) |
| org_id | UUID NOT NULL | |
| site_id | UUID NOT NULL | FK → site |
| target_id | UUID | FK → target (opsional, target yang dikerjakan) |
| mandor_id | UUID NOT NULL | FK → user |
| report_date | date NOT NULL | Tanggal kerja (boleh diisi mandor) |
| worker_attendance | jsonb | Detail absensi pekerja (contoh: `[{"role": "Tukang", "count": 2}]`) |
| work_done | text | Pekerjaan yang dilakukan |
| target_status | text | CHECK in (`tercapai`, `belum`) |
| note | text | |
| voice_note_url | text | URL object storage |
| submit_status | text | CHECK in (`draft`, `queued`, `submitted`) DEFAULT `draft` |
| client_created_at | timestamptz | Waktu HP (referensi saja) |
| submitted_server_at | timestamptz | **Waktu tepercaya** (di-set server saat ack) |
| supersedes_report_id | UUID | FK → daily_report (jika ini koreksi laporan lama) |
| locked | bool | DEFAULT false → true saat submitted |
| created_at | timestamptz | |

- **Koreksi laporan** = buat record baru dengan `supersedes_report_id` mengarah ke yang lama. Yang lama tetap ada (audit).
- `UNIQUE (site_id, report_date) WHERE supersedes_report_id IS NULL AND deleted_at IS NULL` → cegah dobel laporan per titik per hari (kecuali koreksi).

### `evidence` — 🔒 IMMUTABLE
Foto/video. Bisa nempel ke `daily_report` ATAU ke `issue` (salah satu wajib terisi).

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| org_id | UUID NOT NULL | |
| report_id | UUID | FK → daily_report (nullable) |
| issue_id | UUID | FK → issue (nullable) |
| media_type | text | CHECK in (`photo`, `video`) |
| storage_url | text NOT NULL | Object storage (R2/S3) |
| thumbnail_url | text | |
| capture_source | text | CHECK in (`camera_live`, `gallery`) — **flag anti-foto-palsu** |
| gps | geography(Point,4326) | Lokasi saat ambil (dari client) |
| gps_validated | bool | **Dihitung server**: jarak `gps`↔`site.geo` ≤ `geo_radius_m` |
| uploaded_server_at | timestamptz | **Waktu tepercaya** |
| caption | text | |
| created_at | timestamptz | |

- `CHECK (report_id IS NOT NULL OR issue_id IS NOT NULL)` — wajib nempel ke salah satu.
- `capture_source='gallery'` ditampilkan ke kontraktor sebagai badge "foto dari galeri" → transparansi, bukan blokir.

### `issue` (Ada Masalah)
"Material Kurang" di MVP = issue dengan `issue_type='material'` (modul Material penuh ditunda P1).

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| org_id | UUID NOT NULL | |
| site_id | UUID NOT NULL | FK → site |
| reported_by | UUID NOT NULL | FK → user (mandor) |
| issue_type | text | CHECK in (`material`, `pekerja`, `cuaca`, `desain`, `biaya`, `lain`) |
| urgency | text | CHECK in (`low`, `medium`, `high`) DEFAULT `medium` |
| description | text | |
| status | text | CHECK in (`open`, `decided`, `resolved`, `closed`) DEFAULT `open` |
| reported_server_at | timestamptz | Waktu tepercaya |
| created_at | timestamptz | |

### `approval` (Keputusan kontraktor) — 1:1 dengan issue

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| org_id | UUID NOT NULL | |
| issue_id | UUID NOT NULL | FK → issue, `UNIQUE` (1 issue = 1 keputusan) |
| decision | text NOT NULL | CHECK in (`setuju`, `tunda`, `hubungi_saya`) |
| note | text | |
| decided_by | UUID NOT NULL | FK → user (contractor) |
| decided_server_at | timestamptz | Waktu tepercaya |
| created_at | timestamptz | |

> `hubungi_saya` = sekadar trigger tap-to-call nomor mandor di UI. **Bukan** in-app telephony (jangan over-engineer).

### `audit_log` — append-only
Jejak semua aksi penting. Tidak pernah di-update/delete.

| Field | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| org_id | UUID NOT NULL | |
| actor_user_id | UUID | FK → user |
| action | text | mis. `report.submitted`, `issue.decided` |
| entity_type | text | `daily_report`, `issue`, ... |
| entity_id | UUID | |
| metadata | jsonb | Snapshot ringan / nilai sebelum-sesudah |
| created_at | timestamptz | DEFAULT now() |

---

## 2. Relasi (ringkas)

```
organization 1─N user
organization 1─N project
project      1─N site
site         1─N target
site         1─N daily_report
site         1─N issue
user(mandor) 1─N daily_report
target       0..1─N daily_report      (report opsional refer ke target)
daily_report 1─N evidence
issue        1─N evidence
issue        1─1 approval
```

---

## 3. Aturan integritas & trust (penegakan)

1. **Immutability** — Trigger `BEFORE UPDATE` pada `daily_report` & `evidence`: tolak UPDATE jika `locked = true` (report) / selalu (evidence). Koreksi lewat record baru + `supersedes_report_id`.
2. **Waktu tepercaya** — Semua kolom `*_server_at` di-set di service layer / `DEFAULT now()`. Client tidak pernah mengirim waktu submit.
3. **GPS tepercaya** — `gps_validated` dihitung server: `ST_DWithin(evidence.gps, site.geo, site.geo_radius_m)`. Jika site tidak punya `geo`, `gps_validated = NULL` (tak bisa dinilai).
4. **Idempotent sync** — Server `UPSERT by id` (UUID dari client). Retry dari offline queue aman, tidak bikin duplikat.
5. **Append-only audit** — `audit_log` tanpa UPDATE/DELETE (revoke di level role DB).

---

## 4. Offline sync flow (mandor)

```
[draft]  buat di HP, UUID di-generate client, simpan IndexedDB
   │
   ▼ (online / background-sync)
[queued] kirim ke server; media via presigned upload ke R2/S3
   │
   ▼ (server ack)
[submitted] server set submitted_server_at + locked=true; client tandai sinkron
```

- Media diupload terpisah (presigned URL) → record `evidence` dibuat setelah upload sukses.
- Kompresi gambar di client sebelum upload (target ±1–2 MB) untuk koneksi jelek.
- **Video**: dipertimbangkan ditunda ke P1, atau dibatasi ≤15 dtk + kompresi berat.

---

## 5. Index penting (MVP)

```sql
CREATE INDEX ON daily_report (org_id, site_id, report_date);
CREATE INDEX ON daily_report (org_id, submit_status);
CREATE INDEX ON issue        (org_id, status, site_id);
CREATE INDEX ON evidence     (org_id, report_id);
CREATE INDEX ON evidence     (org_id, issue_id);
CREATE INDEX ON site         (org_id, project_id);
CREATE INDEX ON target       (org_id, site_id, due_date);
```

---

## 6. Yang sengaja BELUM dimodelkan (sesuai scope)

| Entitas | Alasan ditunda |
|---|---|
| `material` / inventori | P1. Di MVP cukup jadi `issue_type='material'`. |
| `notification` log | Bisa ditambah saat integrasi FCM/WhatsApp; tidak menghalangi schema inti. |
| Billing / subscription | Fase SaaS. Belum perlu. |
| `client_report` (laporan pemilik) | P2. View turunan dari data yang sudah ada, bukan tabel baru. |

---

## Dashboard derivation (cara status Hijau/Kuning/Merah dihitung)

Status visual **tidak disimpan** — dihitung on-the-fly dari data per hari:

- 🟢 **Aman** — ada `daily_report` submitted hari ini & tidak ada `issue` open.
- 🟡 **Perlu laporan / perhatian** — belum ada report hari ini (sebelum batas jam) ATAU ada issue `open` urgency rendah-sedang.
- 🔴 **Butuh perhatian** — issue `open` urgency tinggi, ATAU target lewat `due_date` status≠done, ATAU belum lapor melewati batas jam.

> Aturan ambang (jam batas lapor, dll) disimpan sebagai konfigurasi per `organization` nanti — di MVP boleh hardcode.
