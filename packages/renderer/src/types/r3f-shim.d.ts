// react-three-fiber v8 declares JSX intrinsic elements via the global JSX namespace,
// but React 19 moved IntrinsicElements to React.JSX. Until r3f v9 lands, we mirror
// ThreeElements onto React.JSX so r3f tags type-check under React 19.
import type { ThreeElements } from '@react-three/fiber'
import 'three'

declare module 'react' {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare global {
  namespace THREE {
    type PerspectiveCamera = import('three').PerspectiveCamera
  }
}

export {}
