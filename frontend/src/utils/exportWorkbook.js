import { strToU8, zipSync } from 'fflate'

function escapeXml(value) {
  const validText = [...String(value ?? '')].filter((character) => {
    const code = character.codePointAt(0)
    return code === 0x9 || code === 0xA || code === 0xD || code >= 0x20
  }).join('')
  return validText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function columnName(index) {
  let name = ''
  let current = index
  while (current > 0) {
    const remainder = (current - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    current = Math.floor((current - 1) / 26)
  }
  return name
}

function normalizedSheetName(name, index) {
  const safeName = String(name ?? `Hoja ${index + 1}`)
    .split('')
    .map((character) => ['\\', '/', '*', '?', ':', '[', ']'].includes(character) ? ' ' : character)
    .join('')
    .trim()
  return (safeName || `Hoja ${index + 1}`).slice(0, 31)
}

function columnWidth(header, rows) {
  const longestValue = rows.reduce((longest, row) => {
    return Math.max(longest, String(row[header] ?? '').length)
  }, header.length)
  return Math.min(Math.max(longestValue + 2, 12), 42)
}

function cellXml(reference, value, style = 0) {
  const styleAttribute = style ? ` s="${style}"` : ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"${styleAttribute} t="n"><v>${value}</v></c>`
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}"${styleAttribute} t="b"><v>${value ? 1 : 0}</v></c>`
  }

  // Se usa inlineStr deliberadamente: incluso valores que comienzan con =,
  // +, - o @ se guardan como texto y Excel nunca los evalúa como fórmulas.
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function worksheetXml(rows) {
  const headers = Object.keys(rows[0] ?? {})
  const columns = headers.map((header, index) => {
    const number = index + 1
    return `<col min="${number}" max="${number}" width="${columnWidth(header, rows)}" customWidth="1"/>`
  }).join('')
  const headerCells = headers.map((header, index) => cellXml(`${columnName(index + 1)}1`, header, 1)).join('')
  const dataRows = rows.map((row, rowIndex) => {
    const cells = headers.map((header, columnIndex) => {
      return cellXml(`${columnName(columnIndex + 1)}${rowIndex + 2}`, row[header])
    }).join('')
    return `<row r="${rowIndex + 2}">${cells}</row>`
  }).join('')
  const range = headers.length ? `A1:${columnName(headers.length)}${Math.max(rows.length + 1, 1)}` : 'A1'

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${columns}</cols>
  <sheetData><row r="1" ht="22" customHeight="1">${headerCells}</row>${dataRows}</sheetData>
  <autoFilter ref="${range}"/>
</worksheet>`
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF97316"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
</styleSheet>`
}

/** Crea un libro XLSX simple y seguro sin evaluar fórmulas de datos de usuario. */
export function createWorkbook(sheets) {
  const validSheets = (Array.isArray(sheets) ? sheets : [])
    .map(({ name, rows }, index) => ({
      name: normalizedSheetName(name, index),
      rows: Array.isArray(rows) ? rows : [],
    }))
    .filter(({ rows }) => Object.keys(rows[0] ?? {}).length > 0)

  if (!validSheets.length) {
    validSheets.push({ name: 'Sin datos', rows: [{ Mensaje: 'No hay datos disponibles para exportar' }] })
  }

  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${validSheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${validSheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${validSheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${validSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(stylesXml()),
  }

  validSheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet.rows))
  })
  return zipSync(files, { level: 6 })
}

export async function exportWorkbook(sheets, filename) {
  const { saveAs } = await import('file-saver')
  const workbook = createWorkbook(sheets)
  saveAs(
    new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  )
}
