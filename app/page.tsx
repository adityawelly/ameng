'use client'
import dynamic from 'next/dynamic'

const PetaAnimasi = dynamic(() => import('@/components/PetaAnimasi'), {
  ssr: false,
  loading: () => <div style={{ width: '100vw', height: '100vh', background: '#0a3d62' }} />,
})

export default function Home() {
  return <PetaAnimasi />
}