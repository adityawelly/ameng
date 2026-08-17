'use client'

/**
 * PerjalananFoto.jsx
 * -------------------
 * Mode "Photo Journey" — menggantikan tampilan peta sepenuhnya (bukan popup).
 * Menampilkan semua foto suatu kota dalam satu halaman scroll vertikal,
 * diurutkan dari yang paling lama ke yang paling baru berdasarkan `tanggal`.
 *
 * Bentuk data per kota (dari tabel `foto_perjalanan` di Supabase, lewat
 * PetaAnimasi.jsx): perjalanan: [{ src, tanggal, lokasi }, ...]
 * `src` = public URL dari Storage bucket `kota-foto`. Kalau belum ada foto
 * (kolom src kosong/null), fallback ke placeholder warna.
 */

import { motion } from 'framer-motion'

const WARNA_PLACEHOLDER = ['#2a6f97', '#468faf', '#61a5c2', '#89c2d9', '#a9d6e5']

function formatTanggal(tanggal) {
  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function PerjalananFoto({ kota, onKembali }) {
  const urutan = [...(kota.perjalanan || [])].sort(
    (a, b) => new Date(a.tanggal) - new Date(b.tanggal)
  )

  return (
    <motion.div
      className="perjalanan"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="kepala">
        <button className="kembali" onClick={onKembali} aria-label="Kembali ke peta">
          &larr; Back
        </button>
        <h2>{kota.nama}</h2>
        <p>{urutan.length} foto perjalanan</p>
      </div>

      <div className="linimasa">
        {urutan.map((item, i) => (
          <motion.figure
            key={i}
            className="bingkai-foto"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.4 }}
          >
            {item.src ? (
              <img className="foto" src={item.src} alt={item.lokasi} loading="lazy" />
            ) : (
              <div
                className="foto-placeholder"
                style={{ background: WARNA_PLACEHOLDER[i % WARNA_PLACEHOLDER.length] }}
              >
                <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#fff" strokeWidth="1.4" aria-hidden="true">
                  <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                <span className="nomor-foto">{i + 1}</span>
              </div>
            )}
            <figcaption>
              <span className="tanggal">{formatTanggal(item.tanggal)}</span>
              <span className="lokasi">{item.lokasi}</span>
            </figcaption>
          </motion.figure>
        ))}
      </div>

      <style jsx>{`
        .perjalanan {
          position: fixed;
          inset: 0;
          overflow-y: auto;
          background: #0a3d62;
          touch-action: pan-y;
        }
        .kepala {
          position: sticky;
          top: 0;
          z-index: 2;
          padding: 16px 20px 14px;
          background: linear-gradient(180deg, rgba(6, 24, 40, 0.95), rgba(6, 24, 40, 0.75));
          backdrop-filter: blur(6px);
          color: #fff;
        }
        .kembali {
          border: 0;
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 7px 12px;
          border-radius: 7px;
          cursor: pointer;
        }
        .kembali:hover { background: rgba(255, 255, 255, 0.22); }
        .kepala h2 { margin: 12px 0 2px; font-size: 1.3rem; }
        .kepala p { margin: 0; font-size: 0.85rem; color: rgba(255, 255, 255, 0.65); }

        .linimasa {
          max-width: 640px;
          margin: 0 auto;
          padding: 20px 20px 60px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .bingkai-foto {
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .foto {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          border-radius: 12px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
        }
        .foto-placeholder {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          border-radius: 12px;
          display: grid;
          place-items: center;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
        }
        .nomor-foto {
          position: absolute;
          bottom: 10px;
          right: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
          background: rgba(0, 0, 0, 0.25);
          padding: 2px 8px;
          border-radius: 999px;
        }
        figcaption {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          color: #fff;
        }
        .tanggal { font-size: 0.8rem; color: rgba(255, 255, 255, 0.6); white-space: nowrap; }
        .lokasi { font-size: 0.95rem; font-weight: 600; text-align: right; }
      `}</style>
    </motion.div>
  )
}
