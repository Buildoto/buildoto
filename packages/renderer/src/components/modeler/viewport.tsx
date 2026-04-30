import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { GltfScene } from './gltf-loader'
import { useSessionStore } from '@/stores/session-store'

export function Viewport() {
  const gltfBase64 = useSessionStore((s) => s.gltfBase64)
  const hasGeometry = !!gltfBase64

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [5, 5, 5], fov: 45 }} shadows>
        <color attach="background" args={['#0b0c0f']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1} castShadow />
        <directionalLight position={[-10, 5, -5]} intensity={0.4} />
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellColor="#2a2d33"
          sectionSize={5}
          sectionColor="#3a3d45"
          fadeDistance={30}
          fadeStrength={1}
          infiniteGrid
        />
        <axesHelper args={[2]} />
        <Suspense fallback={null}>
          {hasGeometry && <GltfScene />}
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      </Canvas>
      {!hasGeometry && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Aucune géométrie — demande à l'agent de construire quelque chose.</p>
        </div>
      )}
      {hasGeometry && (
        <div className="absolute bottom-2 right-2 rounded bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
          glTF {Math.round(gltfBase64.length / 1024)} Ko
        </div>
      )}
    </div>
  )
}
