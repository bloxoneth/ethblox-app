// Standardized build capture configuration for IPFS images
// This ensures consistent rendering across all build previews and NFT images

export const BUILD_CAPTURE_CONFIG = {
  // Camera settings
  camera: {
    // Isometric-style angle (45 degrees from each axis)
    angleHorizontal: 45, // degrees - rotation around Y axis
    angleVertical: 35,   // degrees - elevation angle
    fov: 50,             // field of view
    // Distance is calculated as: max(minDistance, buildSize * distanceMultiplier)
    minDistance: 3,
    distanceMultiplier: 2.5,
  },
  
  // Lighting setup for consistent renders
  lighting: {
    ambient: {
      intensity: 0.5,
    },
    keyLight: {
      position: [10, 15, 10] as [number, number, number],
      intensity: 1.2,
      castShadow: true,
    },
    fillLight: {
      position: [-8, 8, -8] as [number, number, number],
      intensity: 0.4,
    },
    rimLight: {
      position: [0, 5, -15] as [number, number, number],
      intensity: 0.3,
    },
  },
  
  // Background
  background: {
    color: "#1a1a2e", // Dark blue-gray
    showGround: true,
    groundColor: "#252540",
    groundOpacity: 0.6,
  },
  
  // Render settings
  render: {
    width: 1024,
    height: 1024,
    pixelRatio: 2,
    antialias: true,
    shadows: true,
  },
  
  // Brick rendering
  brick: {
    height: 1.0,
    studRadius: 0.155,
    studHeight: 0.05,
    roughness: 0.5,
    metalness: 0.05,
  },
} as const

// Calculate optimal camera position based on build bounds
export function calculateCameraPosition(
  bricks: Array<{ position: [number, number, number]; width: number; depth: number }>
): {
  position: [number, number, number]
  target: [number, number, number]
  distance: number
} {
  if (bricks.length === 0) {
    return {
      position: [5, 5, 5],
      target: [0, 0, 0],
      distance: 8,
    }
  }

  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity

  bricks.forEach((brick) => {
    const [x, y, z] = brick.position
    const halfW = brick.width / 2
    const halfD = brick.depth / 2
    const halfH = BUILD_CAPTURE_CONFIG.brick.height / 2

    minX = Math.min(minX, x - halfW)
    maxX = Math.max(maxX, x + halfW)
    minY = Math.min(minY, y - halfH)
    maxY = Math.max(maxY, y + halfH)
    minZ = Math.min(minZ, z - halfD)
    maxZ = Math.max(maxZ, z + halfD)
  })

  // Calculate center and size
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const centerZ = (minZ + maxZ) / 2

  const sizeX = maxX - minX
  const sizeY = maxY - minY
  const sizeZ = maxZ - minZ
  const maxSize = Math.max(sizeX, sizeY, sizeZ)

  // Calculate distance based on size
  const { minDistance, distanceMultiplier, angleHorizontal, angleVertical } = BUILD_CAPTURE_CONFIG.camera
  const distance = Math.max(minDistance, maxSize * distanceMultiplier)

  // Convert angles to radians
  const hRad = (angleHorizontal * Math.PI) / 180
  const vRad = (angleVertical * Math.PI) / 180

  // Calculate camera position
  const horizontalDist = distance * Math.cos(vRad)
  const cameraX = centerX + horizontalDist * Math.sin(hRad)
  const cameraY = centerY + distance * Math.sin(vRad)
  const cameraZ = centerZ + horizontalDist * Math.cos(hRad)

  return {
    position: [cameraX, cameraY, cameraZ],
    target: [centerX, centerY, centerZ],
    distance,
  }
}

// Generate a deterministic filename for the build image
export function generateBuildImageFilename(buildId: string, tokenId?: number | string): string {
  if (tokenId !== undefined) {
    return `${tokenId}.png`
  }
  return `${buildId}.png`
}
