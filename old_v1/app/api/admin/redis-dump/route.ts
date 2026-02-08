import { redis } from "@/lib/redis"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Starting Redis data dump...")

    const keys = await redis.keys("build:*")
    console.log(`[v0] Found ${keys.length} Redis keys`)

    const rows: any[] = []

    for (const key of keys) {
      try {
        const data = await redis.get(key)
        if (!data) continue

        let buildData: any = {}

        if (typeof data === "object") {
          buildData = data
        } else if (typeof data === "string") {
          try {
            buildData = JSON.parse(data)
          } catch {
            buildData = { rawValue: data }
          }
        }

        // Parse bricks to get count
        let brickCount = 0
        let bricksJson = ""
        if (buildData.bricks) {
          if (typeof buildData.bricks === "string") {
            try {
              const parsed = JSON.parse(buildData.bricks)
              brickCount = Array.isArray(parsed) ? parsed.length : 0
              bricksJson = JSON.stringify(parsed, null, 2)
            } catch {
              bricksJson = buildData.bricks
            }
          } else if (Array.isArray(buildData.bricks)) {
            brickCount = buildData.bricks.length
            bricksJson = JSON.stringify(buildData.bricks, null, 2)
          }
        }

        rows.push({
          key,
          buildId: buildData.id || buildData.buildId || "",
          name: buildData.name || buildData.title || `Build ${buildData.tokenId || ""}`,
          tokenId: buildData.tokenId || "",
          owner: buildData.owner || buildData.creator || "",
          geoHash: buildData.geoHash || "",
          brickCount,
          createdAt: buildData.createdAt || buildData.timestamp || "",
          bricksJson,
          allData: JSON.stringify(buildData, null, 2),
        })
      } catch (error) {
        console.error(`[v0] Error processing key ${key}:`, error)
      }
    }

    console.log(`[v0] Processed ${rows.length} rows`)

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redis Build Database</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
              padding: 40px;
              background: #0a0a0a;
              color: #e5e5e5;
            }
            h1 { 
              color: #3b82f6;
              margin-bottom: 10px;
              font-size: 32px;
            }
            .subtitle {
              color: #888;
              margin-bottom: 30px;
              font-size: 14px;
            }
            .table-container {
              overflow-x: auto;
              background: #1a1a1a;
              border-radius: 8px;
              border: 1px solid #333;
            }
            table { 
              border-collapse: collapse;
              width: 100%;
              font-size: 13px;
            }
            th, td { 
              padding: 12px 16px;
              text-align: left;
              border-bottom: 1px solid #333;
            }
            th { 
              background: #0a0a0a;
              font-weight: 600;
              color: #fff;
              position: sticky;
              top: 0;
              z-index: 10;
            }
            tr:hover { background: #252525; }
            tr:last-child td { border-bottom: none; }
            .mono { font-family: 'Monaco', 'Menlo', monospace; font-size: 11px; }
            .truncate { 
              max-width: 200px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              background: #3b82f6;
              color: white;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
            }
            .btn {
              display: inline-block;
              padding: 4px 12px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              transition: background 0.2s;
            }
            .btn:hover { background: #1d4ed8; }
            .empty { color: #666; font-style: italic; }
          </style>
        </head>
        <body>
          <h1>Redis Build Database</h1>
          <div class="subtitle">${rows.length} builds found</div>
          
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Build ID</th>
                  <th>Name</th>
                  <th>NFT ID</th>
                  <th>Creator</th>
                  <th>BLOX Used</th>
                  <th>Geo Hash</th>
                  <th>Created</th>
                  <th>Geometry</th>
                  <th>Redis Key</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    (row) => `
                  <tr>
                    <td class="mono truncate">${escapeHtml(row.buildId) || '<span class="empty">—</span>'}</td>
                    <td><strong>${escapeHtml(row.name)}</strong></td>
                    <td>${row.tokenId ? `<span class="badge">NFT #${escapeHtml(row.tokenId)}</span>` : '<span class="empty">Not minted</span>'}</td>
                    <td class="mono truncate">${escapeHtml(row.owner) || '<span class="empty">—</span>'}</td>
                    <td><strong>${row.brickCount || 0}</strong> bricks</td>
                    <td class="mono truncate">${escapeHtml(row.geoHash) || '<span class="empty">—</span>'}</td>
                    <td class="mono">${row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '<span class="empty">—</span>'}</td>
                    <td>
                      ${row.bricksJson ? `<a href="#" class="btn" onclick="downloadJSON(${escapeHtml(JSON.stringify(row.bricksJson))}, 'build-${escapeHtml(row.tokenId || row.buildId)}-geometry.json')">Download</a>` : '<span class="empty">No data</span>'}
                    </td>
                    <td class="mono truncate">${escapeHtml(row.key)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          
          <script>
            function downloadJSON(content, filename) {
              const blob = new Blob([content], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          </script>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error) {
    console.error("[v0] Error dumping Redis data:", error)
    return NextResponse.json({ error: "Failed to dump Redis data" }, { status: 500 })
  }
}

function escapeHtml(text: any): string {
  // Convert to string first and handle null/undefined
  const str = text == null ? "" : String(text)
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return str.replace(/[&<>"']/g, (m) => map[m])
}
