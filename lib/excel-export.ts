import * as XLSX from 'xlsx'
import type { TuitionRow } from '@/types/tuition'

interface PaymentServiceRow {
  수취인: string
  전화번호: string
  청구금액: number
  청구사유: string
  안내메세지: string
}

export function exportTuitionToExcel(
  data: TuitionRow[],
  filename: string = 'tuition_export'
) {
  // Transform tuition data to payment service format
  const paymentServiceData: PaymentServiceRow[] = data.map(row => {
    // 청구사유 생성 - 수업기간이 있으면 포함
    let 청구사유 = `${row.year}년 ${row.month}월 ${row.classType}`
    if (row.periodStartDate && row.periodEndDate) {
      청구사유 += ` 수업기간: ${row.periodStartDate} ~ ${row.periodEndDate}`
    }

    return {
      수취인: row.studentName,
      전화번호: '', // This needs to be fetched from students table
      청구금액: row.amount,
      청구사유: 청구사유,
      안내메세지: row.note || ''
    }
  })

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(paymentServiceData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  // Auto-size columns
  const maxWidth = 50
  const colWidths = Object.keys(paymentServiceData[0] || {}).map(key => {
    const columnValues = paymentServiceData.map(row => row[key as keyof PaymentServiceRow])
    const maxLength = Math.max(
      key.length,
      ...columnValues.map(val => String(val).length)
    )
    return { wch: Math.min(maxLength + 2, maxWidth) }
  })
  ws['!cols'] = colWidths

  // Generate filename with current date
  const date = new Date()
  const dateString = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const fullFilename = `${filename}_${dateString}.xlsx`

  // Download file
  XLSX.writeFile(wb, fullFilename)
}

// Enhanced version that includes payment phone numbers (with fallback to parent phone)
export async function exportTuitionToExcelWithPhone(
  data: TuitionRow[],
  getPaymentPhone: (studentId: string) => Promise<{payment: string | null, parent: string | null}>,
  filename: string = 'tuition_export'
) {
  // Fetch payment & parent phone numbers for all students
  const dataWithPhones = await Promise.all(
    data.map(async (row) => {
      const phones = await getPaymentPhone(row.studentId)
      // payment_phone 우선, 없으면 parent_phone 사용
      const finalPhone = phones.payment || phones.parent || ''
      return { ...row, paymentPhone: finalPhone }
    })
  )

  // Transform tuition data to payment service format
  const paymentServiceData: PaymentServiceRow[] = dataWithPhones.map(row => {
    // 청구사유 생성 - 수업기간이 있으면 포함
    let 청구사유 = `${row.year}년 ${row.month}월 ${row.classType}`
    if (row.periodStartDate && row.periodEndDate) {
      청구사유 += ` 수업기간: ${row.periodStartDate} ~ ${row.periodEndDate}`
    }

    return {
      수취인: row.studentName,
      전화번호: row.paymentPhone,
      청구금액: row.amount,
      청구사유: 청구사유,
      안내메세지: row.note || ''
    }
  })

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(paymentServiceData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  // Auto-size columns
  const maxWidth = 50
  const colWidths = Object.keys(paymentServiceData[0] || {}).map(key => {
    const columnValues = paymentServiceData.map(row => row[key as keyof PaymentServiceRow])
    const maxLength = Math.max(
      key.length,
      ...columnValues.map(val => String(val).length)
    )
    return { wch: Math.min(maxLength + 2, maxWidth) }
  })
  ws['!cols'] = colWidths

  // Generate filename with current date
  const date = new Date()
  const dateString = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const fullFilename = `${filename}_${dateString}.xlsx`

  // Download file
  XLSX.writeFile(wb, fullFilename)
}