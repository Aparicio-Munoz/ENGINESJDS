import * as PdfService from '../services/pdf.service.js'

export async function getOrderPDF(req, res, next) {
  try {
    const { buffer, filename } = await PdfService.generateOrderPDF(Number(req.params.id))
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length,
    })
    res.send(buffer)
  } catch (err) {
    next(err)
  }
}
