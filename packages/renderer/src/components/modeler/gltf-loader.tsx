import { useEffect, useState } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Box3, Vector3, type Object3D } from 'three'
import { useThree } from '@react-three/fiber'
import { useSessionStore } from '@/stores/session-store'

export function GltfScene() {
  const gltfBase64 = useSessionStore((s) => s.gltfBase64)
  const [scene, setScene] = useState<Object3D | null>(null)
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera
    controls: { target: Vector3; update?: () => void } | null
  }

  useEffect(() => {
    if (!gltfBase64) {
      setScene(null)
      return
    }
    const bytes = atob(gltfBase64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const loader = new GLTFLoader()
    try {
      loader.parse(
        arr.buffer,
        '',
        (gltf) => {
          const s = gltf.scene
          const box = new Box3().setFromObject(s)
          if (box.isEmpty()) {
            setScene(s)
            return
          }
          const size = box.getSize(new Vector3())
          const center = box.getCenter(new Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const distance = maxDim * 2.5 || 5

          s.position.sub(center)
          camera.position.set(distance, distance, distance)
          camera.near = distance / 100
          camera.far = distance * 100
          camera.updateProjectionMatrix()
          if (controls) {
            controls.target.set(0, 0, 0)
            controls.update?.()
          }
          setScene(s)
        },
        (err) => {
          console.error('[gltf] parse error', err)
          setScene(null)
        },
      )
    } catch (err) {
      console.error('[gltf] exception', err)
      setScene(null)
    }
  }, [gltfBase64, camera, controls])

  if (!scene) return null
  return <primitive object={scene} />
}
