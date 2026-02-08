# SSR/CSP Architecture Rules for Three.js/React Three Fiber

## ⚠️ CRITICAL: DO NOT VIOLATE THESE RULES ⚠️

This document outlines the **mandatory architecture** for integrating Three.js and React Three Fiber (R3F) in Next.js to prevent Server-Side Rendering (SSR) and Content Security Policy (CSP) errors.

**Violating these rules WILL break the application.**

---

## The Problem

Three.js and React Three Fiber rely on browser-only APIs:
- `window`, `document`, `WebGL`, `canvas`
- `eval()` and dynamic code generation for shader compilation
- Web Workers and Blob URLs

When these run during Server-Side Rendering (SSR) in Next.js:
1. **SSR Errors**: "window is not defined", "document is not defined"
2. **CSP Violations**: WebGL requires `unsafe-eval` in Content Security Policy
3. **R3F Hook Errors**: "Hooks can only be used within the Canvas component"

---

## The Solution: 3-Layer Architecture

### Layer A: Server Component (Page)
**File**: `app/build/page.tsx`

```tsx
// ✅ CORRECT: Pure server component, NO client code
import { Suspense } from 'react'

export default function BuildPage() {
  return (
    <div className="h-screen">
      <Suspense fallback={<div>Loading 3D Editor...</div>}>
        {/* Import client boundary dynamically */}
        <BuildClientWrapper />
      </Suspense>
    </div>
  )
}
```

**RULES:**
- ❌ NO `'use client'` directive
- ❌ NO Three.js imports
- ❌ NO React Three Fiber imports
- ❌ NO browser API access
- ✅ ONLY imports client boundary component

---

### Layer B: Client Boundary (Dynamic Import)
**File**: `components/build/BuildClient.tsx`

```tsx
// ✅ CORRECT: Client boundary with dynamic import
'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

// CRITICAL: ssr: false prevents Three.js from executing on server
const V0Blocks = dynamic(() => import('./V0Blocks'), { 
  ssr: false,
  loading: () => <div className="...">Loading 3D Editor...</div>
})

export default function BuildClient() {
  // Client-side state management here
  const [blocks, setBlocks] = useState([])
  
  // ✅ Browser API checks with typeof window
  const saveLocal = () => {
    if (typeof window === 'undefined') return
    localStorage.setItem('blocks', JSON.stringify(blocks))
  }

  return <V0Blocks blocks={blocks} onUpdate={setBlocks} />
}
```

**RULES:**
- ✅ MUST have `'use client'` directive
- ✅ MUST use `dynamic()` with `ssr: false` for Three.js component
- ✅ MUST guard browser APIs with `typeof window !== 'undefined'`
- ❌ NO direct Three.js imports (only dynamically imported child)
- ❌ NO R3F hooks (useThree, useFrame, etc.) - those go in Layer C

**WHY `ssr: false`?**
This tells Next.js to skip this component during server rendering and only mount it in the browser after hydration. Without this, Three.js code runs on the server and crashes.

---

### Layer C: Three.js Component
**File**: `components/build/V0Blocks.tsx`

```tsx
// ✅ CORRECT: All Three.js code isolated here
'use client'

import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Scene component - uses R3F hooks safely
function Scene({ blocks, onUpdate }) {
  // ✅ R3F hooks ONLY inside Canvas children
  const { camera, scene } = useThree()
  
  useFrame(() => {
    // Animation logic
  })

  return (
    <>
      <OrbitControls />
      {blocks.map(block => (
        <mesh key={block.id} position={block.position}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={block.color} />
        </mesh>
      ))}
    </>
  )
}

// Main component - wraps in Canvas
export default function V0Blocks({ blocks, onUpdate }) {
  return (
    <Canvas camera={{ position: [10, 10, 10] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <Scene blocks={blocks} onUpdate={onUpdate} />
    </Canvas>
  )
}
```

**RULES:**
- ✅ MUST have `'use client'` directive
- ✅ ALL Three.js imports allowed here
- ✅ ALL React Three Fiber imports allowed here
- ✅ R3F hooks (useThree, useFrame, etc.) ONLY inside `<Canvas>` children
- ❌ NEVER call useThree(), useFrame() outside Canvas children
- ✅ Canvas must be the root element of this component

**CRITICAL:** R3F hooks like `useThree()` and `useFrame()` can ONLY be called in components that are rendered as children of `<Canvas>`. Put them in a separate `Scene` component.

---

## Content Security Policy (CSP) Configuration

**File**: `next.config.mjs`

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // ← REQUIRED for Three.js
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",                      // ← REQUIRED for textures
              "font-src 'self' data:",
              "connect-src 'self'",
              "worker-src 'self' blob:",                         // ← REQUIRED for workers
              "child-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

**WHY THESE CSP DIRECTIVES?**
- `'unsafe-eval'` - Three.js compiles shaders at runtime using eval-like operations
- `blob:` - WebGL creates blob URLs for workers and texture data
- `data:` - Inline images and fonts used in Three.js scenes
- `'unsafe-inline'` - Some Three.js operations inject inline scripts

**⚠️ WARNING:** Removing `'unsafe-eval'` will break all WebGL/Three.js rendering!

---

## SSR Guards for Browser APIs

All browser API access MUST be guarded:

```tsx
// ✅ CORRECT: localStorage with SSR guard
const saveToStorage = (key: string, value: any) => {
  if (typeof window === 'undefined') return null
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Storage failed:', error)
    return null
  }
}

// ✅ CORRECT: Hydration-safe client state
const [isClient, setIsClient] = useState(false)

useEffect(() => {
  setIsClient(true)
}, [])

if (!isClient) {
  return <div>Loading...</div>
}

// ❌ WRONG: Direct browser API access
const data = localStorage.getItem('blocks') // Crashes on server!
```

**RULES:**
- ✅ ALWAYS check `typeof window !== 'undefined'` before browser APIs
- ✅ Use `useEffect()` for client-only initialization
- ✅ Provide loading states during hydration
- ❌ NEVER access `window`, `document`, `localStorage` without guards

---

## Common Mistakes and Fixes

### ❌ WRONG: Three.js in Server Component
```tsx
// app/build/page.tsx - SERVER COMPONENT
import { Canvas } from '@react-three/fiber' // ❌ BREAKS SSR!

export default function BuildPage() {
  return <Canvas>...</Canvas>
}
```

### ✅ CORRECT: Three.js via Dynamic Import
```tsx
// app/build/page.tsx - SERVER COMPONENT
import BuildClient from '@/components/build/BuildClient'

export default function BuildPage() {
  return <BuildClient />
}

// components/build/BuildClient.tsx - CLIENT BOUNDARY
'use client'
import dynamic from 'next/dynamic'

const V0Blocks = dynamic(() => import('./V0Blocks'), { ssr: false })
```

---

### ❌ WRONG: R3F Hooks Outside Canvas
```tsx
'use client'
import { useThree } from '@react-three/fiber'

export default function V0Blocks() {
  const { camera } = useThree() // ❌ ERROR: Not inside Canvas!
  
  return <Canvas>...</Canvas>
}
```

### ✅ CORRECT: R3F Hooks Inside Canvas Children
```tsx
'use client'
import { Canvas, useThree } from '@react-three/fiber'

function Scene() {
  const { camera } = useThree() // ✅ Inside Canvas
  return <mesh>...</mesh>
}

export default function V0Blocks() {
  return (
    <Canvas>
      <Scene />
    </Canvas>
  )
}
```

---

### ❌ WRONG: Missing ssr: false
```tsx
'use client'
import dynamic from 'next/dynamic'

const V0Blocks = dynamic(() => import('./V0Blocks')) // ❌ Still runs on server!
```

### ✅ CORRECT: Explicit ssr: false
```tsx
'use client'
import dynamic from 'next/dynamic'

const V0Blocks = dynamic(() => import('./V0Blocks'), { 
  ssr: false // ✅ Prevents server execution
})
```

---

### ❌ WRONG: Direct localStorage Access
```tsx
'use client'
export default function BuildClient() {
  const data = localStorage.getItem('blocks') // ❌ Crashes during SSR!
  return <div>{data}</div>
}
```

### ✅ CORRECT: Guarded Browser API
```tsx
'use client'
export default function BuildClient() {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setData(localStorage.getItem('blocks'))
    }
  }, [])
  
  return <div>{data}</div>
}
```

---

## Testing Your Architecture

### ✅ Checklist Before Deployment

1. **Search for violations:**
   ```bash
   # No R3F imports in server components
   grep -r "@react-three/fiber" app/**/*.tsx
   # Should ONLY return client components
   
   # No Three.js imports in server components  
   grep -r "from 'three'" app/**/*.tsx
   # Should ONLY return client components
   ```

2. **Check dynamic imports have ssr: false:**
   ```bash
   grep -r "dynamic.*import.*V0Blocks" components/
   # Should show: ssr: false
   ```

3. **Verify CSP headers in next.config.mjs:**
   - Must include `'unsafe-eval'`
   - Must include `blob:` for images/workers

4. **Test SSR build:**
   ```bash
   npm run build
   # Should complete without errors
   ```

5. **Check browser console:**
   - No CSP violations
   - No "Hooks can only be used within Canvas" errors
   - No "window is not defined" errors

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Layer A: Server Component (app/build/page.tsx)         │
│ ✅ NO 'use client'                                      │
│ ✅ NO Three.js imports                                  │
│ ✅ NO browser APIs                                      │
└────────────────────┬────────────────────────────────────┘
                     │ Imports
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Layer B: Client Boundary (BuildClient.tsx)             │
│ ✅ 'use client' directive                               │
│ ✅ dynamic() with ssr: false                            │
│ ✅ Browser API guards (typeof window)                   │
│ ❌ NO R3F hooks here                                    │
└────────────────────┬────────────────────────────────────┘
                     │ dynamic import with ssr: false
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Layer C: Three.js Component (V0Blocks.tsx)             │
│ ✅ 'use client' directive                               │
│ ✅ All Three.js imports allowed                         │
│ ✅ <Canvas> wrapper                                     │
│ ✅ R3F hooks in Canvas children only                    │
└─────────────────────────────────────────────────────────┘
```

---

## Summary: The Golden Rules

1. **NEVER import Three.js or R3F in server components**
2. **ALWAYS use dynamic import with ssr: false for Three.js components**
3. **ALWAYS place R3F hooks inside Canvas children, never in the Canvas parent**
4. **ALWAYS guard browser APIs with typeof window checks**
5. **ALWAYS include 'unsafe-eval' in CSP for WebGL**
6. **ALWAYS test build process before deployment**

**If you follow these rules, Three.js will work perfectly in Next.js. Break them, and you'll get SSR/CSP errors.**

---

## Quick Reference

| ❌ DON'T | ✅ DO |
|----------|-------|
| Import Three.js in app/*.tsx | Import via dynamic() with ssr: false |
| Call useThree() outside Canvas | Call useThree() in Canvas children |
| Access localStorage directly | Guard with typeof window check |
| Skip ssr: false in dynamic() | Always add ssr: false |
| Remove 'unsafe-eval' from CSP | Keep 'unsafe-eval' for WebGL |
| Mix server and client Three.js | Keep strict 3-layer separation |

---

**Last Updated**: December 2025  
**Status**: Production-tested and stable  
**Breaking this architecture will cause production failures. Treat these rules as immutable.**
