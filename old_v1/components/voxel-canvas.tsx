"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

export type Block = {
  x: number
  y: number
  z: number
  color: string
}

type VoxelCanvasProps = {
  blocks: Block[]
  selectedColor: string
  onBlocksChange: (blocks: Block[]) => void
}

export function VoxelCanvas({ blocks, selectedColor, onBlocksChange }: VoxelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const blockMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const [isAddMode, setIsAddMode] = useState(true)

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf5f5f5)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000,
    )
    camera.position.set(10, 10, 10)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xeeeeee)
    scene.add(gridHelper)

    // Ground plane (invisible, for raycasting)
    const groundGeometry = new THREE.PlaneGeometry(100, 100)
    const groundMaterial = new THREE.MeshBasicMaterial({ visible: false })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.userData.isGround = true
    scene.add(ground)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      renderer.dispose()
      controls.dispose()
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  // Update blocks in scene
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Clear existing block meshes
    blockMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose())
      } else {
        mesh.material.dispose()
      }
    })
    blockMeshesRef.current.clear()

    // Add new block meshes
    blocks.forEach((block) => {
      const geometry = new THREE.BoxGeometry(1, 1, 1)
      const material = new THREE.MeshStandardMaterial({
        color: block.color,
        roughness: 0.7,
        metalness: 0.2,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(block.x, block.y, block.z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.block = block

      const key = `${block.x},${block.y},${block.z}`
      blockMeshesRef.current.set(key, mesh)
      scene.add(mesh)
    })
  }, [blocks])

  // Handle click events
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)

    const allObjects = Array.from(blockMeshesRef.current.values())
    const ground = sceneRef.current.children.find((child) => child.userData.isGround)
    if (ground) allObjects.push(ground as THREE.Mesh)

    const intersects = raycasterRef.current.intersectObjects(allObjects)

    if (intersects.length > 0) {
      const intersect = intersects[0]

      if (isAddMode) {
        // Add mode: place block on face
        const normal = intersect.face?.normal
        if (!normal) return

        const position = intersect.point.clone()
        position.add(normal.multiplyScalar(0.5))

        const x = Math.round(position.x)
        const y = Math.max(0, Math.round(position.y))
        const z = Math.round(position.z)

        // Check if block already exists
        const exists = blocks.some((b) => b.x === x && b.y === y && b.z === z)
        if (!exists) {
          onBlocksChange([...blocks, { x, y, z, color: selectedColor }])
        }
      } else {
        // Remove mode: delete clicked block
        const block = intersect.object.userData.block
        if (block) {
          const newBlocks = blocks.filter((b) => !(b.x === block.x && b.y === block.y && b.z === block.z))
          onBlocksChange(newBlocks)
        }
      }
    }
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full cursor-crosshair" onClick={handleClick} />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <button
          onClick={() => setIsAddMode(true)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isAddMode
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground border border-border hover:bg-muted"
          }`}
        >
          Add Mode
        </button>
        <button
          onClick={() => setIsAddMode(false)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !isAddMode
              ? "bg-destructive text-destructive-foreground"
              : "bg-background text-foreground border border-border hover:bg-muted"
          }`}
        >
          Remove Mode
        </button>
      </div>
    </div>
  )
}
