import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const data = await redis.get<{ blocks: any[]; createdAt: number }>(`creation:${id}`)

    if (!data) {
      return NextResponse.json({ error: "Creation not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Load error:", error)
    return NextResponse.json({ error: "Failed to load" }, { status: 500 })
  }
}
