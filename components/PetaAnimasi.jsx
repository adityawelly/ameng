'use client'

/**
 * PetaAnimasi.jsx
 * ---------------
 * Peta ilustrasi berlapis: peta dasar + awan bergerak + kapal berlayar
 * + kilau air, plus pan/zoom dan titik kota yang bisa diklik.
 *
 * Install:
 *   npm i react-zoom-pan-pinch framer-motion
 *
 * Aset yang dibutuhkan di public/:
 *   peta/dasar.png        peta TANPA kapal & awan
 *   sprite/kapal 1.png    PNG transparan
 *   sprite/kapal 2.png    PNG transparan
 *   sprite/awan.png       PNG transparan
 *
 * Urutan tumpukan (bawah ke atas):
 *   peta dasar -> kilau air -> kapal -> awan -> titik kota -> pop up
 *
 * Titik kota (x/y persen, arah label) dan foto perjalanan (tanggal, lokasi,
 * src) diambil dari Supabase — tabel `kota` + `foto_perjalanan`, foto-fotonya
 * di Storage bucket `kota-foto`. Lihat supabase/migrations/ untuk skemanya.
 */

import { useState, useEffect, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { AnimatePresence, motion } from 'framer-motion'
import PerjalananFoto from './PerjalananFoto'
import { supabase } from '@/lib/supabaseClient'

const PETA = '/peta/dasar.jpg'

// Ukuran asli gambar. Juga jadi sistem koordinat buat jalur kapal.
const LEBAR = 11264
const TINGGI = 6144

const AMBANG_LABEL = 1.8

/**
 * Jalur kapal. Koordinat dalam PIXEL gambar (0..1408, 0..768), bukan persen.
 * Konversi dari picker:  px = persen * 1408 / 100 , py = persen * 768 / 100
 *
 * d  = jalur SVG. M = titik awal, C = kurva bezier, L = garis lurus.
 * durasi = detik untuk sekali lintas. Makin besar makin pelan.
 * mundur = true kalau mau kapal jalan dari ujung akhir ke awal.
 */
const LINTASAN = [
  { id: 'k1', sprite: '/sprite/kapal 1.png', ukuran: 360, d: 'M 2400,4100 C 2000,4400 1800,5300 600,2800 C 600,2800 140,1900 0,1900', durasi: 70, tunda: -5, arahTerbalik: true },
  { id: 'k2', sprite: '/sprite/kapal 1.png', ukuran: 360, d: 'M 5900,3750 C 5484,3745 5084,3900 4700,3500 C 4060,3783 3394,3669 2700,3950', durasi: 95, tunda: -20, arahTerbalik: true },
]

const AWAN = [
  { sprite: '/sprite/awan.png', atas: 6, tinggi: 13, durasi: 120, tunda: 0, opasitas: 0.55 },
  { sprite: '/sprite/awan.png', atas: 24, tinggi: 9, durasi: 165, tunda: -40, opasitas: 0.4 },
  { sprite: '/sprite/awan.png', atas: 52, tinggi: 16, durasi: 200, tunda: -90, opasitas: 0.3 },
  { sprite: '/sprite/awan.png', atas: 74, tinggi: 11, durasi: 145, tunda: -60, opasitas: 0.35 },
]

export default function PetaAnimasi() {
  const [terpilih, setTerpilih] = useState(null)
  const [skala, setSkala] = useState(1)
  const [hematGerak, setHematGerak] = useState(false)
  const [kota, setKota] = useState([])
  // Diukur langsung dari window, bukan CSS vw/vh — biar ukuran .panggung dan
  // trigger remount-nya (key di bawah) selalu konsisten dalam render yang sama.
  const [ukuran, setUkuran] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))

  const tutup = useCallback(() => setTerpilih(null), [])

  // Titik lokasi + foto perjalanannya diambil dari Supabase (tabel kota &
  // foto_perjalanan), bukan hardcode lagi.
  useEffect(() => {
    let dibatalkan = false

    async function ambilKota() {
      const { data, error } = await supabase
        .from('kota')
        .select('id, nama, x, y, arah, foto_perjalanan(src, tanggal, lokasi)')

      if (error) {
        console.error('Gagal mengambil data kota dari Supabase:', error.message)
        return
      }
      if (!dibatalkan) {
        setKota((data || []).map((k) => ({ ...k, perjalanan: k.foto_perjalanan })))
      }
    }

    ambilKota()
    return () => { dibatalkan = true }
  }, [])

  // Hormati setelan "kurangi animasi" di OS. SMIL nggak bisa diatur lewat CSS,
  // jadi animasi kapalnya dimatikan dari sini.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => setHematGerak(mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  useEffect(() => {
    if (!terpilih) return
    const onKey = (e) => e.key === 'Escape' && tutup()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [terpilih, tutup])

  // Kunci scroll dokumen cuma pas mode peta — di mode Photo Journey biarin
  // body scrollable, soalnya scroll internalnya butuh ini di beberapa browser.
  useEffect(() => {
    document.body.style.overflow = terpilih ? '' : 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [terpilih])

  // react-zoom-pan-pinch nyimpen batas pan/zoom-nya dari ukuran pas mount, dan
  // resetTransform() aja ternyata nggak cukup buat bikin dia ngitung ulang
  // dengan bersih pas HP diputar — titik kota jadi keliatan geser. Solusinya:
  // remount total (lewat `key={ukuran.w}x${ukuran.h}` di bawah) plus ukuran
  // .panggung dihitung dari window langsung (bukan vw/vh) biar keduanya selalu
  // sinkron, nggak ada celah waktu antara CSS lama vs JS baru pas rotasi.
  useEffect(() => {
    const set = () => setUkuran({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', set)
    window.addEventListener('orientationchange', set)
    return () => {
      window.removeEventListener('resize', set)
      window.removeEventListener('orientationchange', set)
    }
  }, [])

  // Ukuran .panggung: selalu nutupin viewport penuh (kaya background-size:cover),
  // plus sisa 15% tinggi buat digeser ke atas (lihat geserY) tanpa nyisain celah.
  //
  // Cabang lebar (w * 0.545455) sengaja dikasih buffer +4% ekstra. Tanpa itu,
  // pas landscape cabang ini yang menang dan lebarPanggung jadi PERSIS sama
  // dengan lebar layar (nol slack) — beda tipis sekalipun (rounding subpixel,
  // safe-area, window.innerWidth yang sempat kebaca beda pas rotasi) bikin
  // react-zoom-pan-pinch nganggep konten "fits" terus nge-clamp posisinya ke
  // salah satu tepi alih-alih center, jadi peta & titik kota geser ke kanan.
  // Cabang tinggi (h * 1.15) nggak butuh buffer serupa karena portrait selalu
  // punya slack lebar yang gede banget dari sononya.
  const tinggiDasar = Math.max(ukuran.h * 1.15, ukuran.w * 0.545455 * 1.04)
  const lebarPanggung = tinggiDasar * 1.83333
  const geserY = ukuran.h * 0.15

  return (
    <AnimatePresence mode="wait">
      {terpilih ? (
        <PerjalananFoto key="journey" kota={terpilih} onKembali={tutup} />
      ) : (
        <motion.div
          key="peta"
          className="wadah"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
      <TransformWrapper
        key={`${ukuran.w}x${ukuran.h}`}
        initialScale={1}
        minScale={1}
        maxScale={5}
        centerOnInit
        limitToBounds
        doubleClick={{ mode: 'zoomIn', step: 0.7 }}
        wheel={{ step: 0.02 }}
        onTransformed={(_, state) => setSkala(state.scale)}
      >
        {() => (
			<TransformComponent
			  wrapperStyle={{ width: '100%', height: '100%' }}
			>
              <div
                className="panggung"
                style={{
                  width: `${lebarPanggung}px`,
                  height: `${tinggiDasar}px`,
                  transform: `translateY(-${geserY}px)`,
                }}
              >
                {/* 1. peta dasar */}
                <img src={PETA} alt="Peta ilustrasi Indonesia" draggable={false} className="gambar" />

                {/* 2. kilau air — sapuan cahaya tipis yang lewat berkala */}
                <div className="kilau" aria-hidden="true" />

                {/* 3. kapal */}
                <svg
                  className="lapisan-kapal"
                  viewBox={`0 0 ${LEBAR} ${TINGGI}`}
                  aria-hidden="true"
                  focusable="false"
                >
                  <defs>
                    {LINTASAN.map((l) => (
                      <path key={l.id} id={`jalur-${l.id}`} d={l.d} fill="none" />
                    ))}
                  </defs>

                  {LINTASAN.map((l) => (
                    <g key={l.id}>
                      <image
                        href={l.sprite}
                        width={l.ukuran}
                        height={l.ukuran}
                        x={-l.ukuran / 2}
                        y={-l.ukuran / 2}
                      >
                        {/* goyangan halus biar nggak kaku, seolah kena ombak */}
                        {!hematGerak && (
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            values="-3;3;-3"
                            dur="4s"
                            repeatCount="indefinite"
                          />
                        )}
                      </image>
                      {!hematGerak && (
                        <animateMotion
                          dur={`${l.durasi}s`}
                          begin={`${l.tunda}s`}
                          repeatCount="indefinite"
                          rotate={l.arahTerbalik ? 'auto-reverse' : 'auto'}
                        >
                          <mpath href={`#jalur-${l.id}`} />
                        </animateMotion>
                      )}
                    </g>
                  ))}
                </svg>

                {/* 4. awan */}
                <div className="lapisan-awan" aria-hidden="true">
                  {AWAN.map((a, i) => (
                    <img
                      key={i}
                      src={a.sprite}
                      alt=""
                      draggable={false}
                      className="awan"
                      style={{
                        top: `${a.atas}%`,
                        height: `${a.tinggi}%`,
                        opacity: a.opasitas,
                        animationDuration: `${a.durasi}s`,
                        animationDelay: `${a.tunda}s`,
                      }}
                    />
                  ))}
                </div>

                {/* 5. titik kota */}
				{kota.map((k) => {
				  const labelTampil = skala >= AMBANG_LABEL || terpilih?.id === k.id
				  return (
					<button
					  key={k.id}
					  className="penanda"
					  style={{
						left: `${k.x}%`,
						top: `${k.y}%`,
						transform: `translate(-50%, -50%) scale(${1 / skala})`,
					  }}
					  onClick={() => setTerpilih(k)}
					  aria-label={`Lihat perjalanan foto ${k.nama}`}
					>
					  <span className="denyut" />
					  <svg className="pin" viewBox="0 0 384 512" width="16" height="21" aria-hidden="true">
						<path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.774-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z" />
					  </svg>
					  <span
						className={`nama arah-${k.arah || 'atas'} ${labelTampil ? 'nama-tampil' : ''}`}
					  >
						{k.nama}
					  </span>
					</button>
				  )
				})}
              </div>
            </TransformComponent>
        )}
      </TransformWrapper>

      <style jsx>{`
		.wadah {
		  position: fixed;
		  inset: 0;
		  overflow: hidden;
		  border-radius: 0;
		  background: #0a3d62;
		  touch-action: none;
		}
		.panggung {
		  position: relative;
		  flex-shrink: 0;
		}
		.gambar {
		  display: block;
		  width: 100%;
		  height: 100%;
		  user-select: none;
		  -webkit-user-drag: none;
		}

        /* --- kilau air --- */
        .kilau {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 38%,
            rgba(255, 255, 255, 0.13) 47%,
            rgba(255, 255, 255, 0.05) 52%,
            transparent 61%
          );
          background-size: 260% 100%;
          mix-blend-mode: soft-light;
          animation: sapu 14s ease-in-out infinite;
          will-change: background-position;
        }
        @keyframes sapu {
          0%, 100% { background-position: 120% 0; }
          50% { background-position: -20% 0; }
        }

        /* --- kapal --- */
        .lapisan-kapal {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: visible;
        }

        /* --- awan --- */
        .lapisan-awan {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .awan {
          position: absolute;
          left: 0;
          width: auto;
          animation-name: hanyut;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        @keyframes hanyut {
          from { transform: translateX(-40%); }
          to { transform: translateX(1500%); }
        }

        /* --- titik kota --- */
        .penanda {
          position: absolute;
          display: grid;
          place-items: center;
          width: 0;
          height: 0;
          padding: 0;
          border: 0;
          background: none;
          cursor: pointer;
          z-index: 3;
        }
        .pin {
          grid-area: 1 / 1;
          display: block;
          fill: #e63946;
          stroke: #fff;
          stroke-width: 14px;
          paint-order: stroke fill;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45));
          transform: translateY(-50%);
          transform-origin: 50% 100%;
          transition: transform 0.18s ease;
        }
        .denyut {
          grid-area: 1 / 1;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e63946;
          animation: denyut 2.4s ease-out infinite;
        }
        .penanda:hover .pin { transform: translateY(-50%) scale(1.15); }
        .penanda:focus-visible .pin { outline: 2px solid #fff; outline-offset: 3px; }
		.nama {
		  grid-area: 1 / 1;
		  white-space: nowrap;
		  font-size: 12px;
		  font-weight: 700;
		  color: #fff;
		  padding: 2px 7px;
		  border-radius: 5px;
		  background: rgba(6, 24, 40, 0.72);
		  backdrop-filter: blur(2px);
		  pointer-events: none;
		  opacity: 0;
		  transition: opacity 0.22s ease;
		}
		.nama-tampil { opacity: 1; }
		.penanda:hover .nama { opacity: 1; }

		.arah-atas  { transform: translateY(-26px); }
		.arah-bawah { transform: translateY(24px); }
		.arah-kiri  { transform: translateX(-50%) translateX(-14px); }
		.arah-kanan { transform: translateX(50%) translateX(14px); }
        @keyframes denyut {
          0% { transform: scale(1); opacity: 0.55; }
          75%, 100% { transform: scale(3.6); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .kilau, .awan, .denyut { animation: none; }
          .denyut { opacity: 0; }
        }
      `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}