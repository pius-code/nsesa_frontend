/**
 * CSV Preview and Validation Utility
 * Supports both snake_case headers and export headers.
 */

export interface PreviewRow {
  rowNumber: number
  productName: string
  price: number | null
  quantity: number | null
  costPrice: number | null
  sku: string | null
  category: string | null
  branch: string | null
  supplierName: string | null
  isValid: boolean
  error?: string
}

export interface CSVPreviewResult {
  rows: PreviewRow[]
  totalRows: number
  validCount: number
  errorCount: number
  missingRequired?: string[]
}

const COLUMN_ALIASES: Record<string, string[]> = {
  product_name: ["product_name", "product name", "product", "name", "item_name", "item name", "item"],
  product_price: ["product_price", "product price", "retail_price", "retail price", "retail price (ghs)", "price", "selling_price", "selling price", "unit_price"],
  amount_available: ["amount_available", "amount available", "quantity in stock", "quantity", "qty", "stock", "stock count", "units"],
  cost_price: ["cost_price", "cost price", "cost price (ghs)", "cost", "unit_cost", "purchase_price"],
  sku: ["sku", "barcode", "item_sku", "product_sku", "code"],
  category: ["category", "category_name", "category name", "department"],
  branch: ["branch", "branch_name", "branch name", "location", "store"],
  supplier_name: ["supplier_name", "supplier name", "supplier", "vendor"],
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim())
      currentField = ""
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++
      }
      currentRow.push(currentField.trim())
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ""
    } else {
      currentField += char
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

function cleanNumeric(val: string | undefined): number | null {
  if (!val) return null
  const cleaned = val.replace(/[^\d.-]/g, "").trim()
  if (!cleaned) return null
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export function parseCSVPreview(text: string): CSVPreviewResult {
  const parsedRows = parseCSV(text)
  if (parsedRows.length === 0) {
    return { rows: [], totalRows: 0, validCount: 0, errorCount: 0, missingRequired: ["Empty file"] }
  }

  const rawHeaders = parsedRows[0]
  const colMap: Record<number, string> = {}

  rawHeaders.forEach((header, idx) => {
    const clean = header.trim().toLowerCase()
    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(clean)) {
        colMap[idx] = canonical
        break
      }
    }
  })

  const mappedKeys = new Set(Object.values(colMap))
  const required = ["product_name", "product_price", "amount_available"]
  const missing = required.filter((k) => !mappedKeys.has(k))

  if (missing.length > 0) {
    const friendlyMap: Record<string, string> = {
      product_name: "Product Name (or product_name)",
      product_price: "Retail Price (or product_price)",
      amount_available: "Quantity in Stock (or amount_available)",
    }
    return {
      rows: [],
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      missingRequired: missing.map((m) => friendlyMap[m] || m),
    }
  }

  const rows: PreviewRow[] = []
  let validCount = 0
  let errorCount = 0

  for (let i = 1; i < parsedRows.length; i++) {
    const rawRow = parsedRows[i]
    const rowData: Record<string, string> = {}

    rawRow.forEach((val, idx) => {
      const canonical = colMap[idx]
      if (canonical) {
        rowData[canonical] = val
      }
    })

    const productName = (rowData.product_name || "").trim()
    const priceNum = cleanNumeric(rowData.product_price)
    const qtyNum = cleanNumeric(rowData.amount_available)
    const costNum = cleanNumeric(rowData.cost_price)
    const sku = (rowData.sku || "").trim() || null
    const category = (rowData.category || "").trim() || null
    const branch = (rowData.branch || "").trim() || null
    const supplierName = (rowData.supplier_name || "").trim() || null

    let isValid = true
    let error: string | undefined

    if (!productName) {
      isValid = false
      error = "Missing product name"
    } else if (priceNum === null || priceNum < 0) {
      isValid = false
      error = "Invalid price (must be >= 0)"
    } else if (qtyNum === null || qtyNum < 0) {
      isValid = false
      error = "Invalid quantity (must be >= 0)"
    }

    if (isValid) validCount++
    else errorCount++

    rows.push({
      rowNumber: i + 1,
      productName,
      price: priceNum,
      quantity: qtyNum !== null ? Math.round(qtyNum) : null,
      costPrice: costNum,
      sku,
      category,
      branch,
      supplierName,
      isValid,
      error,
    })
  }

  return {
    rows,
    totalRows: rows.length,
    validCount,
    errorCount,
  }
}
