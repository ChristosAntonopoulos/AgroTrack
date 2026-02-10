import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportData {
  headers: string[];
  rows: any[][];
  title?: string;
}

export const exportService = {
  exportToCSV: (data: ExportData, filename: string = 'export') => {
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportToExcel: (data: ExportData, filename: string = 'export') => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      data.headers,
      ...data.rows,
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  },

  exportToPDF: async (elementId: string, filename: string = 'export', title?: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found for PDF export');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    if (title) {
      pdf.setFontSize(16);
      pdf.text(title, 105, 15, { align: 'center' });
      position = 25;
      heightLeft -= 10;
    }

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
  },

  exportTableToPDF: (data: ExportData, filename: string = 'export') => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const rowHeight = 7;
    const colWidth = (pageWidth - 2 * margin) / data.headers.length;

    let y = margin + 10;

    // Title
    if (data.title) {
      pdf.setFontSize(16);
      pdf.text(data.title, pageWidth / 2, y, { align: 'center' });
      y += 10;
    }

    // Headers
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    data.headers.forEach((header, index) => {
      pdf.text(header, margin + index * colWidth, y);
    });
    y += rowHeight;

    // Rows
    pdf.setFont(undefined, 'normal');
    data.rows.forEach((row) => {
      if (y + rowHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      row.forEach((cell, index) => {
        pdf.text(String(cell), margin + index * colWidth, y);
      });
      y += rowHeight;
    });

    pdf.save(`${filename}.pdf`);
  },
};
