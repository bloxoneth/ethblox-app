"use client"

import { Check } from "lucide-react"

const COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Pink", value: "#ec4899" },
  { name: "White", value: "#ffffff" },
  { name: "Gray", value: "#6b7280" },
  { name: "Black", value: "#000000" },
]

type ColorPaletteProps = {
  selectedColor: string
  onColorChange: (color: string) => void
}

export function ColorPalette({ selectedColor, onColorChange }: ColorPaletteProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Color Palette</h3>
      <div className="grid grid-cols-5 gap-2">
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onColorChange(color.value)}
            className="relative h-10 w-10 rounded-lg border-2 transition-all hover:scale-110"
            style={{
              backgroundColor: color.value,
              borderColor: selectedColor === color.value ? "hsl(var(--primary))" : "hsl(var(--border))",
            }}
            title={color.name}
          >
            {selectedColor === color.value && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="h-5 w-5" style={{ color: color.value === "#ffffff" ? "#000" : "#fff" }} />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
