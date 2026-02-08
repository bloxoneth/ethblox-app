"use client"

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import {
  Hammer,
  Move,
  Eraser,
  Undo2,
  Redo2,
  ArrowLeftRight,
  Save,
  FolderOpen,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Zap,
  Box,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import type { Brick } from "@/lib/types"
import { saveBuild, loadBuild, deleteBuild, type SavedBuild } from "@/lib/storage"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useMetaMask } from "@/contexts/metamask-context"
import { useBloxBalance } from "@/lib/web3/hooks/useBloxBalance"
import { MintBuildModal } from "./MintBuildModal"
import { calculateTotalBlox } from "@/lib/brick-utils"

const BRICK_HEIGHT = 1.0
const GROUND_HEIGHT = 0.25
const GRID_UNIT = 1.0
const LAYER_GAP = 0.005

const COLOR_THEMES = {
  default: [
    "#FF3333", // Red
    "#FF9933", // Orange
    "#FFCC33", // Yellow
    "#33CC66", // Green
    "#33CCFF", // Light Blue
    "#3366CC", // Dark Blue
    "#9933CC", // Purple
    "#333333", // Black
  ],
  muted: [
    "#D67070", // Muted Red
    "#D69970", // Muted Orange
    "#D6C670", // Muted Yellow
    "#70B270", // Muted Green
    "#70B2B2", // Muted Cyan
    "#7095CC", // Muted Blue
    "#9970B2", // Muted Purple
    "#606060", // Dark Gray
  ],
  monochrome: [
    "#FFFFFF", // White
    "#DDDDDD", // Light Gray 1
    "#BBBBBB", // Light Gray 2
    "#999999", // Mid Gray 1
    "#777777", // Mid Gray 2
    "#555555", // Dark Gray 1
    "#333333", // Dark Gray 2
    "#1A1A1A", // Near Black
  ],
}

type Mode = "build" | "move" | "erase"
type Theme = "default" | "muted" | "monochrome"

interface V0BlocksProps {
  initialBaseWidth?: number
  initialBaseDepth?: number
  initialLoadedBuild?: SavedBuild | null
  showLoadDialogImmediately?: boolean
  nftGeometry?: Brick[] | null
  onNFTPlaced?: () => void
  nftComposition?: Record<string, { count: number; name: string }>
  onBricksCleared?: () => void
}

const BrickMesh = React.memo(function BrickMesh({
  brick,
  isGhost,
  isEraseHover,
  onClick,
}: {
  brick: Brick
  isGhost?: boolean
  isEraseHover?: boolean
  onClick?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  // Only run animation frame for ghost/hover bricks
  useFrame(
    isGhost || isEraseHover
      ? (state) => {
          if (materialRef.current) {
            const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.05 + 0.95
            materialRef.current.emissiveIntensity = pulse
          }
        }
      : () => {},
  )

  // Memoize studs array to avoid recalculation on every render
  const studs = React.useMemo(() => {
    const result: [number, number, number][] = []
    for (let i = 0; i < Math.floor(brick.width); i++) {
      for (let j = 0; j < Math.floor(brick.depth); j++) {
        result.push([i - brick.width / 2 + 0.5, BRICK_HEIGHT / 2 + 0.025, j - brick.depth / 2 + 0.5])
      }
    }
    return result
  }, [brick.width, brick.depth])

  const color = isGhost ? "#ffff00" : isEraseHover ? "#ff0000" : brick.color
  const opacity = isGhost || isEraseHover ? 0.6 : 1.0
  const emissive = isGhost ? "#ffff00" : isEraseHover ? "#ff0000" : "#000000"

  return (
    <group ref={groupRef} position={brick.position}>
      <mesh onClick={onClick} castShadow receiveShadow>
        <boxGeometry args={[brick.width, BRICK_HEIGHT, brick.depth]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          transparent={opacity < 1}
          opacity={opacity}
          roughness={0.5}
          metalness={0.05}
          emissive={emissive}
          emissiveIntensity={isGhost || isEraseHover ? 0.9 : 0}
        />
      </mesh>
      {studs.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <sphereGeometry args={[0.25, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={color}
            transparent={opacity < 1}
            opacity={opacity}
            roughness={0.5}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  )
})

function Platform({ baseWidth, baseDepth }: { baseWidth: number; baseDepth: number }) {
  const studPositions = React.useMemo(() => {
    const positions: [number, number, number][] = []
    const startX = -Math.floor(baseWidth / 2)
    const startZ = -Math.floor(baseDepth / 2)

    for (let x = 0; x < baseWidth; x++) {
      for (let z = 0; z < baseDepth; z++) {
        const studX = startX + x
        const studZ = startZ + z
        positions.push([studX, GROUND_HEIGHT / 2, studZ])
      }
    }
    return positions
  }, [baseWidth, baseDepth])

  return (
    <group>
      {studPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <sphereGeometry args={[0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e8f4f8" roughness={0.3} metalness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

const GroundHighlight = React.memo(function GroundHighlight({
  position,
  width,
  depth,
  isValid,
}: {
  position: [number, number, number]
  width: number
  depth: number
  isValid: boolean
}) {
  return (
    <mesh position={[position[0], 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial color={isValid ? "#00ff00" : "#ff0000"} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  )
})

function Scene({
  bricks,
  ghostBrick,
  groundHighlight,
  onCanvasClick,
  onBrickClick,
  mode,
  baseWidth,
  baseDepth,
  isPlaying,
  hoverGroupId,
  onMouseMove,
  isShiftPressed,
  nftGhostBricks,
  cameraRef,
  isMobile,
  ghostPositionRef,
  hoverGroupIdFromScene,
}: {
  bricks: Brick[]
  ghostBrick: Brick | null
  groundHighlight: { position: [number, number, number]; isValid: boolean } | null
  onCanvasClick: (point: THREE.Vector3) => void
  onBrickClick: (id: string) => void
  mode: "build" | "move" | "erase"
  baseWidth: number
  baseDepth: number
  isPlaying: boolean
  hoverGroupId: string | null
  onMouseMove: (event: PointerEvent) => void
  isShiftPressed: boolean
  nftGhostBricks: Brick[] | null
  cameraRef: any
  isMobile: boolean
  ghostPositionRef: React.MutableRefObject<{ x: number; z: number } | null>
  hoverGroupIdFromScene: string | null
}) {
  const { gl, scene, camera } = useThree()
  const controlsRef = useRef<any>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  
  // Reusable THREE objects to avoid GC pressure from creating new ones every frame
  const raycasterRef = useRef(new THREE.Raycaster())
  const groundPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const pointOnGroundRef = useRef(new THREE.Vector3())
  const intersectionPointRef = useRef(new THREE.Vector3())
  const minVecRef = useRef(new THREE.Vector3())
  const maxVecRef = useRef(new THREE.Vector3())
  const boxRef = useRef(new THREE.Box3())

  useEffect(() => {
    cameraRef.current = camera
  }, [camera, cameraRef])

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 15, 15)
      cameraRef.current.lookAt(0, 0, 0)
    }
  }, [cameraRef])

  // Only run frame updates when playing - skip entirely otherwise
  useFrame(
    isPlaying
      ? () => {
          if (controlsRef.current) {
            controlsRef.current.autoRotateSpeed = 1
          }
        }
      : () => {},
  )

  useEffect(() => {
    // Don't track mouse movement when in move mode or shift is pressed - let OrbitControls handle it
    if (mode === "move" || isShiftPressed) return

    const handlePointerMove = (e: PointerEvent) => {
      if (isMobile && touchStartRef.current) {
        const dx = e.clientX - touchStartRef.current.x
        const dy = e.clientY - touchStartRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance > 10) {
          isDraggingRef.current = true
        }
      }
      onMouseMove(e)
    }

    gl.domElement.addEventListener("pointermove", handlePointerMove)
    return () => gl.domElement.removeEventListener("pointermove", handlePointerMove)
  }, [gl.domElement, onMouseMove, mode, isShiftPressed, isMobile])

  useEffect(() => {
    if (isShiftPressed || mode !== "build") return

    const handlePointerDown = (e: PointerEvent) => {
      if (isMobile) {
        // Mobile: just record the start position, don't place yet
        touchStartRef.current = { x: e.clientX, y: e.clientY }
        isDraggingRef.current = false
        return
      }

      // Desktop: place immediately on click - reuse raycaster
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycasterRef.current.setFromCamera({ x, y }, camera)

      if (raycasterRef.current.ray.intersectPlane(groundPlaneRef.current, pointOnGroundRef.current)) {
        console.log("[v0] Desktop click detected at:", pointOnGroundRef.current)
        onCanvasClick(pointOnGroundRef.current.clone())
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isMobile) return

      if (!isDraggingRef.current && touchStartRef.current && ghostPositionRef.current) {
        // Use the ghost brick position instead of raycasting again
        // This ensures brick lands exactly where the ghost is showing
        pointOnGroundRef.current.set(ghostPositionRef.current.x, 0, ghostPositionRef.current.z)
        console.log("[v0] Mobile tap - placing at ghost position:", pointOnGroundRef.current)
        onCanvasClick(pointOnGroundRef.current.clone())
      }

      // Reset touch tracking
      touchStartRef.current = null
      isDraggingRef.current = false
    }

    gl.domElement.addEventListener("pointerdown", handlePointerDown)
    gl.domElement.addEventListener("pointerup", handlePointerUp)
    return () => {
      gl.domElement.removeEventListener("pointerdown", handlePointerDown)
      gl.domElement.removeEventListener("pointerup", handlePointerUp)
    }
  }, [gl.domElement, camera, onCanvasClick, mode, isShiftPressed, isMobile, ghostPositionRef])

  return (
    <>
      <color attach="background" args={["#1a1a2e"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        enabled={mode === "move" || isPlaying || isShiftPressed}
        autoRotate={isPlaying}
        autoRotateSpeed={1}
        minDistance={10}
        maxDistance={40}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.5}
      />

      <Platform baseWidth={baseWidth} baseDepth={baseDepth} />

      {bricks.map((brick, i) => (
        <BrickMesh
          key={i}
          brick={brick}
          isEraseHover={mode === "erase" && hoverGroupId !== null && (brick.nftGroupId === hoverGroupId || brick.id === hoverGroupId)}
          onClick={() => !isShiftPressed && onBrickClick(brick.id)}
        />
      ))}

      {ghostBrick && mode === "build" && <BrickMesh brick={ghostBrick} isGhost onClick={() => {}} />}

      {groundHighlight && mode === "build" && (
        <GroundHighlight position={groundHighlight.position} width={1} depth={1} isValid={groundHighlight.isValid} />
      )}

      {nftGhostBricks &&
        mode === "build" &&
        nftGhostBricks.map((brick, i) => <BrickMesh key={i} brick={brick} isGhost onClick={() => {}} />)}
    </>
  )
}

export default function V0Blocks({
  initialBaseWidth = 20,
  initialBaseDepth = 20,
  initialLoadedBuild = null,
  showLoadDialogImmediately = false,
  nftGeometry = null,
  nftInfo = null,
  onNFTPlaced,
  onResetBase,
  onBricksCleared,
  onBricksDeleted,
  nftComposition = {},
  initialBricks,
  onAutoSave,
  onClearNFTMode,
  onOpenNFTDrawer,
  onRotateNFT,
}: {
  initialBaseWidth?: number
  initialBaseDepth?: number
  nftGeometry?: Brick[] | null
  nftInfo?: { name: string; tokenId: number } | null
  onNFTPlaced?: (tokenId: number, name: string, bricksCount: number, brickIds: string[]) => void
  onResetBase?: () => void
  onBricksCleared?: () => void
  onBricksDeleted?: (deletedBrickIds: string[]) => void
  nftComposition?: Record<string, { count: number; name: string }>
  initialLoadedBuild?: any
  showLoadDialogImmediately?: boolean
  initialBricks?: Brick[]
  onAutoSave?: (bricks: Brick[]) => void
  onClearNFTMode?: () => void
  onOpenNFTDrawer?: () => void
  onRotateNFT?: () => void
} = {}) {
  const [bricks, setBricks] = useState<Brick[]>(initialBricks || [])
  const [history, setHistory] = useState<Brick[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [mode, setMode] = useState<Mode>("build")
  const [theme, setTheme] = useState<Theme>("default")
  const [colorIndex, setColorIndex] = useState(1)
  const [width, setWidth] = useState(1)
  const [depth, setDepth] = useState(3)
  const [ghostBrick, setGhostBrick] = useState<Brick | null>(null)
  const [groundHighlight, setGroundHighlight] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [buildName, setBuildName] = useState("")
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null)
  const [saves, setSaves] = useState<SavedBuild[]>([])
  const { toast } = useToast()
  const { account, isConnected, connect } = useMetaMask()
  const { isCorrectChain, switchToBaseSepolia } = useBloxBalance()
  const [buildId] = useState<string>(() => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [mintDialogOpen, setMintDialogOpen] = useState(false)
  const snapGridEnabled = true
  const [nftGhostBricks, setNftGhostBricks] = useState<Brick[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isPlacing, setIsPlacing] = useState(false)
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false)
  const [isBottomBarCollapsed, setIsBottomBarCollapsed] = useState(false)

  const ghostPositionRef = useRef<{ x: number; z: number } | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  
  // Reusable THREE objects for handleMouseMove to avoid GC pressure
  const mouseMoveRaycasterRef = useRef(new THREE.Raycaster())
  const mouseMoveGroundPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const mouseMovePointRef = useRef(new THREE.Vector3())
  const mouseMoveMinRef = useRef(new THREE.Vector3())
  const mouseMoveMaxRef = useRef(new THREE.Vector3())
  const mouseMoveBoxRef = useRef(new THREE.Box3())
  const mouseMoveIntersectRef = useRef(new THREE.Vector3())
  
  const [hoverBrick, setHoverBrick] = useState<Brick | null>(null)
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null) // Tracks NFT group or single brick ID for erase hover
  const [hoverGroupIdFromScene, setHoverGroupIdFromScene] = useState<string | null>(null) // Tracks NFT group or single brick ID for erase hover

  const colors = COLOR_THEMES[theme]
  const selectedColor = colors[colorIndex]

  // Wrapper functions that clear NFT mode when user interacts with brick controls
  const handleColorSelect = useCallback((index: number) => {
    onClearNFTMode?.()
    setColorIndex(index)
  }, [onClearNFTMode])

  const handleWidthChange = useCallback((newWidth: number | ((w: number) => number)) => {
    onClearNFTMode?.()
    setWidth(newWidth)
  }, [onClearNFTMode])

  const handleDepthChange = useCallback((newDepth: number | ((d: number) => number)) => {
    onClearNFTMode?.()
    setDepth(newDepth)
  }, [onClearNFTMode])

  const [baseWidth, setBaseWidth] = useState(initialBaseWidth)
  const [baseDepth, setBaseDepth] = useState(initialBaseDepth)

  const getNFTBounds = useCallback((geometry: Brick[]) => {
    let minX = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY,
      minZ = Number.POSITIVE_INFINITY,
      maxZ = Number.NEGATIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY

    for (const brick of geometry) {
      const halfWidth = brick.width / 2
      const halfDepth = brick.depth / 2
      const halfHeight = BRICK_HEIGHT / 2

      minX = Math.min(minX, brick.position[0] - halfWidth)
      maxX = Math.max(maxX, brick.position[0] + halfWidth)
      minZ = Math.min(minZ, brick.position[2] - halfDepth)
      maxZ = Math.max(maxZ, brick.position[2] + halfDepth)
      minY = Math.min(minY, brick.position[1] - halfHeight)
    }

    return {
      minX,
      maxX,
      minZ,
      maxZ,
      minY,
      width: maxX - minX,
      depth: maxZ - minZ,
    }
  }, [])

  const calculateNFTMinimumY = useCallback(
    (nftGeo: typeof nftGeometry, clickX: number, clickZ: number) => {
      if (!nftGeo || nftGeo.length === 0) {
        return GROUND_HEIGHT + BRICK_HEIGHT / 2 + LAYER_GAP
      }

      let maxHeightBelow = 0

      // Check every brick position in the NFT to find the highest obstruction
      for (const nftBrick of nftGeo) {
        const brickWorldX = Math.round(clickX + nftBrick.position[0])
        const brickWorldZ = Math.round(clickZ + nftBrick.position[2])

        const evenOffsetX = nftBrick.width % 2 === 0 ? 0.5 : 0
        const evenOffsetZ = nftBrick.depth % 2 === 0 ? 0.5 : 0

        const finalX = brickWorldX + evenOffsetX
        const finalZ = brickWorldZ + evenOffsetZ

        // Check what's below this brick position
        for (const existingBrick of bricks) {
          const [bx, by, bz] = existingBrick.position
          const brickLeft = bx - existingBrick.width / 2
          const brickRight = bx + existingBrick.width / 2
          const brickFront = bz - existingBrick.depth / 2
          const brickBack = bz + existingBrick.depth / 2

          const newLeft = finalX - nftBrick.width / 2
          const newRight = finalX + nftBrick.width / 2
          const newFront = finalZ - nftBrick.depth / 2
          const newBack = finalZ + nftBrick.depth / 2

          const overlapsX = newLeft < brickRight && newRight > brickLeft
          const overlapsZ = newFront < brickBack && newBack > brickFront

          if (overlapsX && overlapsZ) {
            const brickTopY = by + BRICK_HEIGHT / 2
            if (brickTopY > maxHeightBelow) {
              maxHeightBelow = brickTopY
            }
          }
        }
      }

      const finalY =
        maxHeightBelow === 0
          ? GROUND_HEIGHT + BRICK_HEIGHT / 2 + LAYER_GAP
          : maxHeightBelow + BRICK_HEIGHT / 2 + LAYER_GAP

      console.log("[v0] NFT minimum Y calculation:", {
        clickX,
        clickZ,
        maxHeightBelow,
        finalY,
      })

      return finalY
    },
    [bricks],
  )

  const calculateYPosition = useCallback(
    (x: number, z: number, w: number, d: number): number => {
      let maxHeightBelow = 0

      for (const brick of bricks) {
        const [bx, by, bz] = brick.position
        const brickLeft = bx - brick.width / 2
        const brickRight = bx + brick.width / 2
        const brickFront = bz - brick.depth / 2
        const brickBack = bz + brick.depth / 2

        const newLeft = x - w / 2
        const newRight = x + w / 2
        const newFront = z - d / 2
        const newBack = z + d / 2

        const MIN_OVERLAP = 0.01
        const overlapsX = newLeft < brickRight - MIN_OVERLAP && newRight > brickLeft + MIN_OVERLAP
        const overlapsZ = newFront < brickBack - MIN_OVERLAP && newBack > brickFront + MIN_OVERLAP

        // Only consider this brick as "below" if it overlaps in both dimensions
        if (overlapsX && overlapsZ) {
          const brickTopY = brick.position[1] + BRICK_HEIGHT / 2
          if (brickTopY > maxHeightBelow) {
            maxHeightBelow = brickTopY
          }
        }
      }

      const finalY =
        maxHeightBelow === 0
          ? GROUND_HEIGHT + BRICK_HEIGHT / 2 + LAYER_GAP
          : maxHeightBelow + BRICK_HEIGHT / 2 + LAYER_GAP

      console.log("[v0] Y calculation:", {
        x,
        z,
        w,
        d,
        maxHeightBelow,
        finalY,
        layerCount: Math.round((finalY - GROUND_HEIGHT - BRICK_HEIGHT / 2) / (BRICK_HEIGHT + LAYER_GAP)) + 1,
      })

      return finalY
    },
    [bricks],
  )

  const positionNFTBricks = useCallback(
    (nftGeo: typeof nftGeometry, clickX: number, clickZ: number) => {
      if (!nftGeo || nftGeo.length === 0) {
        return []
      }

      const bounds = getNFTBounds(nftGeo)
      const nftY = calculateNFTMinimumY(nftGeo, clickX, clickZ)

      console.log("[v0] Positioning NFT as rigid object:", { clickX, clickZ, nftY, bounds })

      return nftGeo.map((nftBrick) => {
        const brickWorldX = Math.round(clickX + nftBrick.position[0])
        const brickWorldZ = Math.round(clickZ + nftBrick.position[2])

        const evenOffsetX = nftBrick.width % 2 === 0 ? 0.5 : 0
        const evenOffsetZ = nftBrick.depth % 2 === 0 ? 0.5 : 0

        const finalX = brickWorldX + evenOffsetX
        const finalZ = brickWorldZ + evenOffsetZ
        const finalY = nftY + nftBrick.position[1]

        return {
          id: `${Date.now()}-${Math.random()}`,
          position: [finalX, finalY, finalZ] as [number, number, number],
          color: nftBrick.color,
          width: nftBrick.width,
          depth: nftBrick.depth,
        }
      })
    },
    [getNFTBounds, calculateNFTMinimumY],
  )

  const addToHistory = useCallback(
    (newBricks: Brick[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1)
        newHistory.push(newBricks)
        return newHistory
      })
      setHistoryIndex((prev) => prev + 1)
      setBricks(newBricks)
    },
    [historyIndex],
  )

  // Modified checkCollision to accept bricks array as an argument
  const checkCollision = useCallback((newBrick: Brick, existingBricks: Brick[]): boolean => {
    const [x, y, z] = newBrick.position
    const halfW = newBrick.width / 2
    const halfD = newBrick.depth / 2
    const halfH = BRICK_HEIGHT / 2

    const newLeft = x - halfW
    const newRight = x + halfW
    const newFront = z - halfD
    const newBack = z + halfD
    const newBottom = y - halfH
    const newTop = y + halfH

    for (const brick of existingBricks) {
      const [bx, by, bz] = brick.position
      const bHalfW = brick.width / 2
      const bHalfD = brick.depth / 2
      const bHalfH = BRICK_HEIGHT / 2

      const bLeft = bx - bHalfW
      const bRight = bx + bHalfW
      const bFront = bz - bHalfD
      const bBack = bz + bHalfD
      const bBottom = by - bHalfH
      const bTop = by + bHalfH

      // Check for overlap in all three dimensions - no tolerance for edge touching
      const overlapsX = newLeft < bRight && newRight > bLeft
      const overlapsZ = newFront < bBack && newBack > bFront
      const overlapsY = newBottom < bTop && newTop > bBottom

      if (overlapsX && overlapsZ && overlapsY) {
        console.log("[v0] Collision detected with brick:", brick)
        return true
      }
    }

    return false
  }, [])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setBricks(history[newIndex])
      setNftGhostBricks([])
      toast({ title: "Undo" })
    }
  }, [historyIndex, history, toast])

  const handleCanvasClick = useCallback(
    async (point: THREE.Vector3) => {
      const x = point.x
      const z = point.z

      if (isPlacing) return

      // Check if NFT is being placed
      if (nftGeometry && nftGeometry.length > 0 && nftInfo) {
        // Added check for nftInfo
        console.log("[v0] Placing NFT with", nftGeometry.length, "bricks")
        setIsPlacing(true)

        const snappedX = Math.round(x)
        const snappedZ = Math.round(z)

        // Position all NFT bricks with individual Y calculations
        const newBricks = positionNFTBricks(nftGeometry, snappedX, snappedZ)
        
        // Generate a unique group ID for this NFT placement
        const nftGroupId = `nft-${nftInfo.tokenId}-${Date.now()}`
        
        // Add nftGroupId to all bricks in this NFT
        const newBricksWithGroup = newBricks.map(brick => ({
          ...brick,
          nftGroupId,
        }))

        // Filter out bricks that collide
        const validBricks = newBricksWithGroup.filter((brick) => !checkCollision(brick, bricks))

        console.log("[v0] NFT bricks:", { total: newBricks.length, valid: validBricks.length })

        if (validBricks.length > 0) {
          addToHistory([...bricks, ...validBricks])

          console.log("[v0] NFT placed, clearing selection")
          toast({ title: `Placed ${nftInfo.name}` })
          onNFTPlaced?.(
            nftInfo.tokenId,
            nftInfo.name,
            nftGeometry.length,
            validBricks.map((b) => b.id),
          )
        } else {
          console.log("[v0] NFT placement blocked by collisions")
          toast({ title: "NFT placement blocked by collision", variant: "destructive" })
        }

        setTimeout(() => setIsPlacing(false), 100)
        return
      }

      // Regular brick placement
      const hasGhostBrick = ghostBrick !== null
      const isGroundValid = groundHighlight?.isValid === true

      console.log("[v0] Click check:", {
        hasNftGeometry: !!nftGeometry,
        mode,
        hasGhostBrick,
        isGroundValid,
      })

      if (mode !== "build" || !ghostBrick || !groundHighlight?.isValid) return

      const placementX = ghostPositionRef.current?.x ?? ghostBrick.position[0]
      const placementZ = ghostPositionRef.current?.z ?? ghostBrick.position[2]

      console.log("[v0] Placing regular brick at:", {
        x: placementX,
        z: placementZ,
        width: ghostBrick.width,
        depth: ghostBrick.depth,
      })

      // Use actual placement position for Y calculation (includes even-offset)
      const yPos = calculateYPosition(placementX, placementZ, ghostBrick.width, ghostBrick.depth)

      const newBrick: Brick = {
        id: Date.now().toString(),
        position: [placementX, yPos, placementZ],
        color: ghostBrick.color,
        width: ghostBrick.width,
        depth: ghostBrick.depth,
      }

      if (!checkCollision(newBrick, bricks)) {
        addToHistory([...bricks, newBrick])
      }
    },
    [
      mode,
      bricks,
      ghostBrick,
      groundHighlight,
      nftGeometry,
      nftInfo, // Include nftInfo in dependencies
      isPlacing,
      addToHistory,
      checkCollision,
      calculateYPosition,
      positionNFTBricks,
      onNFTPlaced,
      onResetBase, // Add onResetBase to dependencies
      toast, // Add toast to dependencies
    ],
  )

const handleBrickClick = useCallback(
  (id: string) => {
  if (mode === "erase") {
  // Find the clicked brick to check if it's part of an NFT group
  const clickedBrick = bricks.find((b) => b.id === id)
  
  if (clickedBrick?.nftGroupId) {
  // Delete all bricks in the same NFT group
  const groupId = clickedBrick.nftGroupId
  const bricksToDelete = bricks.filter((b) => b.nftGroupId === groupId)
  const newBricks = bricks.filter((b) => b.nftGroupId !== groupId)
  addToHistory(newBricks)
  onBricksDeleted?.(bricksToDelete.map((b) => b.id))
  toast({ title: `NFT removed (${bricksToDelete.length} bricks)` })
  } else {
  // Delete single brick
  const newBricks = bricks.filter((b) => b.id !== id)
  addToHistory(newBricks)
  onBricksDeleted?.([id])
  toast({ title: "Brick removed" })
  }
  }
  },
  [mode, bricks, addToHistory, onBricksDeleted, toast],
  )

  const handleMouseMove = useCallback(
    (event: PointerEvent) => {
      if (isDragging) return

      const clientX = (event.clientX / window.innerWidth) * 2 - 1
      const clientY = -(event.clientY / window.innerHeight) * 2 + 1

      if (!cameraRef.current) return

      // Handle NFT ghost bricks
      if (nftGeometry && nftGeometry.length > 0 && nftInfo && mode === "build") {
        // Reuse raycaster and plane refs
        mouseMoveRaycasterRef.current.setFromCamera({ x: clientX, y: clientY }, cameraRef.current)

        if (mouseMoveRaycasterRef.current.ray.intersectPlane(mouseMoveGroundPlaneRef.current, mouseMovePointRef.current)) {
          const snappedX = Math.round(mouseMovePointRef.current.x)
          const snappedZ = Math.round(mouseMovePointRef.current.z)

          ghostPositionRef.current = { x: snappedX, z: snappedZ }

          // Create ghost bricks for the entire NFT
          const nftGhostBrickList = positionNFTBricks(nftGeometry, snappedX, snappedZ)
          setNftGhostBricks(nftGhostBrickList)
          setGhostBrick(null)
          setGroundHighlight({ position: [snappedX, 0, snappedZ], isValid: true })
        } else {
          setNftGhostBricks(null)
          setGhostBrick(null)
          setGroundHighlight(null)
          ghostPositionRef.current = null
        }
        return
      }

      setNftGhostBricks(null)

      // Handle erase mode - raycast to find brick under cursor
      if (mode === "erase") {
        setGhostBrick(null)
        setGroundHighlight(null)
        ghostPositionRef.current = null
        
        // Reuse raycaster ref
        mouseMoveRaycasterRef.current.setFromCamera({ x: clientX, y: clientY }, cameraRef.current)
        
        // Find which brick is under the cursor by checking intersection with brick bounding boxes
        let closestBrick: Brick | null = null
        let closestDistance = Infinity
        
        for (const brick of bricks) {
          // Reuse vector refs for bounding box
          const halfWidth = brick.width / 2
          const halfDepth = brick.depth / 2
          const halfHeight = BRICK_HEIGHT / 2
          
          mouseMoveMinRef.current.set(
            brick.position[0] - halfWidth,
            brick.position[1] - halfHeight,
            brick.position[2] - halfDepth
          )
          mouseMoveMaxRef.current.set(
            brick.position[0] + halfWidth,
            brick.position[1] + halfHeight,
            brick.position[2] + halfDepth
          )
          
          mouseMoveBoxRef.current.set(mouseMoveMinRef.current, mouseMoveMaxRef.current)
          
          if (mouseMoveRaycasterRef.current.ray.intersectBox(mouseMoveBoxRef.current, mouseMoveIntersectRef.current)) {
            const distance = mouseMoveRaycasterRef.current.ray.origin.distanceTo(mouseMoveIntersectRef.current)
            if (distance < closestDistance) {
              closestDistance = distance
              closestBrick = brick
            }
          }
        }
        
        // If brick is part of an NFT group, highlight the whole group, otherwise just the brick
        if (closestBrick) {
          setHoverGroupId(closestBrick.nftGroupId || closestBrick.id)
        } else {
          setHoverGroupId(null)
        }
        return
      }

      if (mode !== "build") {
        setGhostBrick(null)
        setGroundHighlight(null)
        ghostPositionRef.current = null
        setHoverGroupId(null)
        return
      }
      
      setHoverGroupId(null)

      // Reuse raycaster and plane refs
      mouseMoveRaycasterRef.current.setFromCamera({ x: clientX, y: clientY }, cameraRef.current)

      if (mouseMoveRaycasterRef.current.ray.intersectPlane(mouseMoveGroundPlaneRef.current, mouseMovePointRef.current)) {
        const snappedX = Math.round(mouseMovePointRef.current.x)
        const snappedZ = Math.round(mouseMovePointRef.current.z)

        const evenOffsetX = width % 2 === 0 ? 0.5 : 0
        const evenOffsetZ = depth % 2 === 0 ? 0.5 : 0
        const finalX = snappedX + evenOffsetX
        const finalZ = snappedZ + evenOffsetZ

        ghostPositionRef.current = { x: finalX, z: finalZ }

        // Use finalX/finalZ for Y calculation to match actual brick position
        const yPos = calculateYPosition(finalX, finalZ, width, depth)

        setGhostBrick({
          id: "ghost",
          color: selectedColor,
          position: [finalX, yPos, finalZ],
          width,
          depth,
        })
        setGroundHighlight({ position: [snappedX, 0, snappedZ], isValid: true })
      } else {
        setGhostBrick(null)
        setGroundHighlight(null)
        ghostPositionRef.current = null
      }
    },
    [isDragging, nftGeometry, nftInfo, mode, width, depth, selectedColor, calculateYPosition, positionNFTBricks, bricks],
  )

  const handleSave = async () => {
    if (!buildName.trim()) {
      toast({ title: "Error", description: "Please enter a build name", variant: "destructive" })
      return
    }

    if (!account) {
      toast({ title: "Error", description: "Please connect your wallet first", variant: "destructive" })
      return
    }

    try {
      // Check if a build with the same name already exists (for this user)
      const existingBuilds = loadBuild(account)
      const existingBuild = existingBuilds.find(b => b.name.toLowerCase() === buildName.trim().toLowerCase())

      // Use existing build ID if updating, or current build ID, or generate new one
      const saveId = existingBuild?.id || currentBuildId || undefined

      saveBuild(buildName, bricks, account, baseWidth, baseDepth, saveId)

      // Update current build ID to the saved build's ID
      const updatedBuilds = loadBuild(account)
      const savedBuild = updatedBuilds.find(b => b.name.toLowerCase() === buildName.trim().toLowerCase())
      if (savedBuild) {
        setCurrentBuildId(savedBuild.id)
      }

      setSaves(updatedBuilds)
      setShowSaveDialog(false)
      toast({ title: existingBuild ? "Updated" : "Saved", description: buildName })
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save build",
        variant: "destructive",
      })
    }
  }

  const handleLoad = (save: SavedBuild) => {
    if (save.baseWidth && save.baseDepth) {
      setBaseWidth(save.baseWidth)
      setBaseDepth(save.baseDepth)
    }
    
    // Set the build name and ID so subsequent saves update this build
    setBuildName(save.name)
    setCurrentBuildId(save.id)

    addToHistory(save.bricks)
    setShowLoadDialog(false)
    toast({ title: "Loaded", description: save.name })
  }

  const handleClear = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ethblox_autosave")
    }
    addToHistory([])
    setShowClearDialog(false)
    onBricksCleared?.()
    onResetBase?.() // Also reset base when clearing
    toast({ title: "Build cleared, returning to base selection" })
  }

  const handleDelete = (id: string) => {
    if (!isConnected || !account) return

    deleteBuild(id, account)
    setSaves(loadBuild(account))
    toast({ title: "Deleted", description: "Build removed" })
  }

  const cycleTheme = () => {
    setTheme((t) => (t === "default" ? "muted" : t === "muted" ? "monochrome" : "default"))
  }

  const handleMint = () => {
    console.log("[v0] Mint button clicked")

    if (!isConnected || !account) {
      console.log("[v0] User not connected, prompting to connect")
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint your creation.",
        variant: "destructive",
      })
      return
    }

    if (bricks.length === 0) {
      console.log("[v0] No bricks to mint")
      toast({
        title: "Nothing to mint",
        description: "Add some bricks to your creation before minting.",
        variant: "destructive",
      })
      return
    }

    setMintDialogOpen(true)
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key to place brick
      if (e.key === "Enter" && mode === "build") {
        console.log("[v0] Enter pressed - attempting to place brick")

        // If NFT geometry exists, place the NFT
        if (nftGeometry && nftGeometry.length > 0 && nftInfo && ghostPositionRef.current) {
          // Added check for nftInfo
          console.log("[v0] Enter: NFT geometry available, placing at:", ghostPositionRef.current)

          const { x, z } = ghostPositionRef.current
          const baseX = Math.round(x)
          const baseZ = Math.round(z)

          // Use positionNFTBricks to get properly positioned NFT bricks
          const nftBricks = positionNFTBricks(nftGeometry, baseX, baseZ)
          
          // Generate a unique group ID for this NFT placement
          const nftGroupId = `nft-${nftInfo.tokenId}-${Date.now()}`
          
          // Add nftGroupId to all bricks in this NFT
          const nftBricksWithGroup = nftBricks.map(brick => ({
            ...brick,
            nftGroupId,
          }))

          // Filter out bricks that collide
          const validBricks = nftBricksWithGroup.filter((brick) => !checkCollision(brick, bricks))

          console.log("[v0] NFT bricks:", { total: nftBricks.length, valid: validBricks.length })

          if (validBricks.length > 0) {
            addToHistory([...bricks, ...validBricks])
            console.log("[v0] NFT placed via Enter, clearing selection")
            toast({ title: `Placed ${nftInfo.name}` }) // Use nftInfo.name for toast
            onNFTPlaced?.(
              nftInfo.tokenId,
              nftInfo.name,
              nftGeometry.length,
              validBricks.map((b) => b.id),
            ) // Pass relevant data to onNFTPlaced
            onResetBase?.() // Call onResetBase after placing NFT
          } else {
            console.log("[v0] NFT placement blocked by collisions")
            toast({ title: "NFT placement blocked by collision", variant: "destructive" })
          }

          return
        }

        // Otherwise place regular brick at ghost position
        if (ghostBrick && groundHighlight?.isValid && ghostPositionRef.current) {
          console.log("[v0] Enter: Placing regular brick at:", ghostPositionRef.current)

          const placementX = ghostPositionRef.current.x
          const placementZ = ghostPositionRef.current.z
          // Use actual placement position for Y calculation (includes even-offset)
          const yPos = calculateYPosition(placementX, placementZ, ghostBrick.width, ghostBrick.depth)

          const newBrick: Brick = {
            id: Date.now().toString(),
            position: [placementX, yPos, placementZ],
            color: ghostBrick.color,
            width: ghostBrick.width,
            depth: ghostBrick.depth,
          }

          if (!checkCollision(newBrick, bricks)) {
            addToHistory([...bricks, newBrick])
            console.log("[v0] Regular brick placed via Enter")
          } else {
            console.log("[v0] Regular brick placement blocked by collision")
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    mode,
    nftGeometry,
    nftInfo, // Include nftInfo in dependencies
    ghostBrick,
    groundHighlight,
    bricks,
    positionNFTBricks,
    checkCollision,
    calculateYPosition,
    addToHistory,
    onNFTPlaced,
    onResetBase, // Add onResetBase to dependencies
    toast, // Add toast to dependencies
  ])

  const loadFromGallery = async (buildId: string) => {
    try {
      const response = await fetch(`/api/builds/${buildId}`)
      if (!response.ok) throw new Error("Failed to load build")
      const build = await response.json()
      addToHistory(build.bricks)
      toast({ title: "Build loaded", description: `"${build.name}"` })
    } catch (error) {
      toast({ title: "Failed to load build", variant: "destructive" })
    }
  }

  useEffect(() => {
    const initialLoadId = localStorage.getItem("ethblox_load_build")
    if (initialLoadId) {
      localStorage.removeItem("ethblox_load_build")
      loadFromGallery(initialLoadId)
    } else if (initialLoadedBuild && initialLoadedBuild.bricks) {
      addToHistory(initialLoadedBuild.bricks)
      // Set the build name and ID so subsequent saves update this build
      if (initialLoadedBuild.name) {
        setBuildName(initialLoadedBuild.name)
      }
      if (initialLoadedBuild.id) {
        setCurrentBuildId(initialLoadedBuild.id)
      }
      toast({ title: "Build loaded", description: initialLoadedBuild.name || "Untitled" })
      // If an initial build is loaded, reset the base
      onResetBase?.()
    }
  }, [initialLoadedBuild, addToHistory, toast, onResetBase]) // Add onResetBase to dependency array

  useEffect(() => {
    const isClient = typeof window !== "undefined"
    if (isClient) {
      if (isConnected && account) {
        setSaves(loadBuild(account))
      } else {
        setSaves([])
      }
    }
  }, [isConnected, account])

  useEffect(() => {
    const isClient = typeof window !== "undefined"
    if (isClient) {
      localStorage.setItem(
        "ethblox_autosave",
        JSON.stringify({ bricks, width, depth, colorIndex, theme, baseWidth, baseDepth }),
      )
    }
  }, [bricks, width, depth, colorIndex, theme, baseWidth, baseDepth])

  // Auto-save callback for session persistence
  useEffect(() => {
    if (onAutoSave && bricks.length > 0) {
      onAutoSave(bricks)
    }
  }, [bricks, onAutoSave])

  // Update ghost brick color when color selection changes
  useEffect(() => {
    if (ghostBrick && ghostBrick.color !== selectedColor) {
      setGhostBrick(prev => prev ? { ...prev, color: selectedColor } : null)
    }
  }, [selectedColor, ghostBrick])

  // Clear NFT ghost bricks when nftGeometry is cleared
  useEffect(() => {
    if (!nftGeometry) {
      setNftGhostBricks([])
    }
  }, [nftGeometry])

  useEffect(() => {
    if (showLoadDialogImmediately) {
      setShowLoadDialog(true)
    }
  }, [showLoadDialogImmediately])

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        camera={{ position: [25, 25, 25], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => {}}
      >
        <Scene
          bricks={bricks}
          baseWidth={baseWidth}
          baseDepth={baseDepth}
          mode={mode}
          isPlaying={isPlaying}
          ghostBrick={ghostBrick}
          groundHighlight={groundHighlight}
          hoverGroupId={hoverGroupId}
          onCanvasClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          isShiftPressed={isShiftPressed} // Pass isShiftPressed to Scene
          onBrickClick={handleBrickClick} // Added onBrickClick prop
          nftGhostBricks={nftGhostBricks}
          cameraRef={cameraRef}
          isMobile={isMobile} // Pass isMobile to Scene
          ghostPositionRef={ghostPositionRef} // Pass ghostPositionRef to Scene
          hoverGroupIdFromScene={hoverGroupIdFromScene}
        />
      </Canvas>

      {/* Top bar - full width panel, below main header */}
      <div className="absolute top-14 left-0 right-0 z-30 bg-[hsl(210,11%,15%)] backdrop-blur-lg border-b border-[hsl(210,8%,28%)] px-2 md:px-4 py-2 shadow-2xl">
        <div className="flex items-center gap-3">
          {!isPlaying ? (
            <>
              {/* Undo/Redo */}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleUndo}
                disabled={historyIndex === 0}
                className="w-8 h-8 text-zinc-400 hover:text-white disabled:opacity-30"
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (historyIndex < history.length - 1) {
                    setHistoryIndex(historyIndex + 1)
                    setBricks(history[historyIndex + 1])
                  }
                }}
                disabled={historyIndex === history.length - 1}
                className="w-8 h-8 text-zinc-400 hover:text-white disabled:opacity-30"
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-zinc-600" />
              {/* Save/Load */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSaveDialog(true)}
                className="w-8 h-8 text-zinc-400 hover:text-white"
                title="Save Build"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowLoadDialog(true)}
                className="w-8 h-8 text-zinc-400 hover:text-white"
                title="Load Build"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              {/* Parts counter rendered by V0BlocksV2 */}
            </>
          ) : (
            /* Play mode: show exit button */
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPlaying(false)}
              className="text-zinc-400 hover:text-white text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Exit Preview
            </Button>
          )}
        </div>
      </div>

      {/* Left toolbar - compact with modes, NFT, rotate, mint */}
      {!isPlaying && (
        <>
          <button
            onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
            className={`absolute top-1/2 -translate-y-1/2 z-30 bg-[hsl(210,11%,18%)] backdrop-blur-lg border border-[hsl(210,8%,28%)] shadow-2xl text-zinc-400 hover:text-white transition-all duration-300 ${
              isToolbarCollapsed ? "left-0 rounded-r-lg p-2" : "left-[52px] md:left-[56px] rounded-r-lg p-1"
            }`}
          >
            {isToolbarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>

          <div className={`absolute top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 transition-all duration-300 ${
            isToolbarCollapsed ? "-left-16" : "left-2"
          }`}>
            {/* Mode tools */}
            <div className="bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-xl border border-[hsl(210,8%,28%)] p-1 shadow-2xl flex flex-col gap-0.5">
              <Button
                size="icon"
                onClick={() => setMode("build")}
                className={`w-9 h-9 rounded-lg ${
                  mode === "build" ? "bg-[#cdfc2d] text-black" : "bg-black/30 text-zinc-400"
                }`}
                title="Build"
              >
                <Hammer className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => setMode("move")}
                className={`w-9 h-9 rounded-lg ${
                  mode === "move" ? "bg-[#cdfc2d] text-black" : "bg-black/30 text-zinc-400"
                }`}
                title="Move Camera"
              >
                <Move className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => setMode("erase")}
                className={`w-9 h-9 rounded-lg ${
                  mode === "erase" ? "bg-[#cdfc2d] text-black" : "bg-black/30 text-zinc-400"
                }`}
                title="Erase"
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </div>

            {/* NFT + Rotate */}
            <div className="bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-xl border border-[hsl(210,8%,28%)] p-1 shadow-2xl flex flex-col gap-0.5">
              {nftGeometry ? (
                <>
                  <Button
                    size="icon"
                    onClick={() => onClearNFTMode?.()}
                    className="w-9 h-9 bg-[#cdfc2d] text-black rounded-lg"
                    title="NFT Mode Active - Click to Exit"
                  >
                    <Box className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onRotateNFT}
                    className="w-9 h-9 text-zinc-400 hover:text-white"
                    title="Rotate NFT 90°"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onOpenNFTDrawer}
                  className="w-9 h-9 text-zinc-400 hover:text-white"
                  title="Place NFT Builds"
                >
                  <Box className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Mint button */}
            {bricks.length > 0 && (
              <div className="bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-xl border border-[#CDFD3E] p-1 shadow-2xl">
                <Button
                  size="icon"
                  onClick={handleMint}
                  className="w-9 h-9 bg-[#CDFD3E] text-black hover:bg-[#b8e835] rounded-lg"
                  title={`Mint Build`}
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* BLOX counter */}
            {bricks.length > 0 && (
              <div className="bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-xl border border-[hsl(210,8%,28%)] px-3 py-1.5 shadow-2xl flex items-center justify-center min-w-[40px]">
                <span className="text-[#CDFD3E] font-mono text-xs font-semibold text-center">{calculateTotalBlox(bricks)}</span>
              </div>
            )}
          </div>
        </>
      )}

      

      {/* Desktop bottom toolbar - collapsible */}
      {!isPlaying && !isMobile && (
        <>
          {/* Collapse toggle */}
          <button
            onClick={() => setIsBottomBarCollapsed(!isBottomBarCollapsed)}
            className={`absolute left-1/2 -translate-x-1/2 z-30 hidden md:flex bg-[hsl(210,11%,18%)] backdrop-blur-lg border border-[hsl(210,8%,28%)] shadow-2xl text-zinc-400 hover:text-white transition-all duration-300 rounded-t-lg px-3 py-1 ${
              isBottomBarCollapsed ? "bottom-0" : "bottom-[60px]"
            }`}
          >
            {isBottomBarCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <div className={`absolute left-1/2 -translate-x-1/2 z-30 hidden md:block transition-all duration-300 ${
            isBottomBarCollapsed ? "-bottom-20" : "bottom-4"
          }`}>
            <div className="flex items-center gap-1.5 bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-full border border-[hsl(210,8%,28%)] px-3 py-1.5 shadow-2xl">
              {colors.map((color, i) => (
                <button
                  key={i}
                  onClick={() => handleColorSelect(i)}
                  className={`w-5 h-5 rounded-full transition ${
                    colorIndex === i ? "ring-2 ring-white ring-offset-1 ring-offset-[hsl(210,11%,18%)] scale-125" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="w-px h-5 bg-zinc-700 mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white font-mono text-xs h-7 px-1.5">
                    {width} <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {[1, 2, 3, 4, 6, 8].map((w) => (
                    <DropdownMenuItem key={w} onClick={() => handleWidthChange(w)}>
                      {w}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  onClearNFTMode?.()
                  const temp = width
                  setWidth(depth)
                  setDepth(temp)
                }}
                className="w-6 h-6 text-zinc-400 hover:text-white"
              >
                <ArrowLeftRight className="h-3 w-3" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white font-mono text-xs h-7 px-1.5">
                    {depth} <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {[1, 2, 3, 4, 6, 8].map((d) => (
                    <DropdownMenuItem key={d} onClick={() => handleDepthChange(d)}>
                      {d}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="w-px h-5 bg-zinc-700 mx-1" />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsPlaying(true)}
                className="w-6 h-6 text-zinc-400 hover:text-white"
              >
                <Play className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => bricks.length > 0 && setShowClearDialog(true)}
                disabled={bricks.length === 0}
                className="w-6 h-6 text-zinc-400 hover:text-white disabled:opacity-30"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Mobile bottom toolbar - collapsible */}
      {!isPlaying && isMobile && (
        <>
          {/* Collapse toggle for mobile */}
          <button
            onClick={() => setIsBottomBarCollapsed(!isBottomBarCollapsed)}
            className={`absolute left-1/2 -translate-x-1/2 z-30 md:hidden bg-[hsl(210,11%,18%)] backdrop-blur-lg border border-[hsl(210,8%,28%)] border-b-0 shadow-2xl text-zinc-400 hover:text-white transition-all duration-300 rounded-t-lg px-4 py-1 ${
              isBottomBarCollapsed ? "bottom-0" : "bottom-[88px]"
            }`}
          >
            {isBottomBarCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <div className={`absolute left-0 right-0 z-30 md:hidden transition-all duration-300 ${
            isBottomBarCollapsed ? "-bottom-24" : "bottom-0"
          }`}>
            <div className="bg-[hsl(210,11%,18%)] border-t border-[hsl(210,8%,28%)] px-2 py-2 pb-3">
              {/* Color palette - smaller circles */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {colors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => handleColorSelect(i)}
                    className={`w-6 h-6 rounded-full flex-shrink-0 transition ${
                      colorIndex === i ? "ring-2 ring-white ring-offset-1 ring-offset-[hsl(210,11%,18%)] scale-125" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Size controls - compact row */}
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center bg-black/30 rounded-lg">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleWidthChange((w) => Math.max(1, w - 1))}
                    className="h-7 w-7 text-zinc-400 p-0 text-sm"
                  >
                    -
                  </Button>
                  <span className="text-white font-mono w-4 text-center text-xs">{width}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleWidthChange((w) => Math.min(baseWidth, w + 1))}
                    className="h-7 w-7 text-zinc-400 p-0 text-sm"
                  >
                    +
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    onClearNFTMode?.()
                    const temp = width
                    setWidth(depth)
                    setDepth(temp)
                  }}
                  className="w-7 h-7 text-zinc-400 hover:text-white"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                </Button>
                <div className="flex items-center bg-black/30 rounded-lg">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDepthChange((d) => Math.max(1, d - 1))}
                    className="h-7 w-7 text-zinc-400 p-0 text-sm"
                  >
                    -
                  </Button>
                  <span className="text-white font-mono w-4 text-center text-xs">{depth}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDepthChange((d) => Math.min(baseDepth, d + 1))}
                    className="h-7 w-7 text-zinc-400 p-0 text-sm"
                  >
                    +
                  </Button>
                </div>
                <div className="w-px h-5 bg-zinc-700" />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsPlaying(true)}
                  className="w-7 h-7 text-zinc-400 hover:text-white"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => bricks.length > 0 && setShowClearDialog(true)}
                  disabled={bricks.length === 0}
                  className="w-7 h-7 text-zinc-400 hover:text-white disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Move mode tip for mobile */}
      {isMobile && mode === "move" && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/70 text-white text-xs px-3 py-2 rounded-full font-mono">
            1 finger rotate / 2 fingers zoom & pan
          </div>
        </div>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Build</DialogTitle>
            <DialogDescription>
              {isConnected 
                ? (currentBuildId ? "Update your build or change the name to save as new" : "Give your creation a name")
                : "Connect your wallet to save builds"}
            </DialogDescription>
          </DialogHeader>
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You need to connect your wallet to save builds. Your wallet address will be used to identify your
                creations.
              </p>
              <Button onClick={connect} className="w-full">
                Connect Wallet
              </Button>
            </div>
          ) : (
            <>
              <Input
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                placeholder="Build name..."
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!buildName.trim()}>
                  {currentBuildId ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Build</DialogTitle>
            <DialogDescription>
              {isConnected ? "Select a saved build" : "Connect your wallet to load your builds"}
            </DialogDescription>
          </DialogHeader>
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Connect your wallet to see your saved builds.</p>
              <Button onClick={connect} className="w-full">
                Connect Wallet
              </Button>
            </div>
          ) : saves.length === 0 ? (
            <p className="text-muted-foreground">No saved builds</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {saves.map((save) => (
                <div key={save.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-accent">
                  <button onClick={() => handleLoad(save)} className="flex-1 text-left">
                    <div className="font-medium">{save.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(save.timestamp).toLocaleDateString()}</div>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(save.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear This Build?</DialogTitle>
            <DialogDescription>
              This will remove all {bricks.length} BLOX and reset the base. You'll need to select a new base size to
              start building again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              Clear Build & Base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MintBuildModal
        open={mintDialogOpen}
        onOpenChange={setMintDialogOpen}
        buildId={buildId}
        buildName={buildName}
        bricks={bricks}
        baseWidth={baseWidth}
        baseDepth={baseDepth}
        composition={nftComposition}
      />

      <Toaster />
    </div>
  )
}
