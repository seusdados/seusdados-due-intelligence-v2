import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  // Criar dados formatados para o Excel
  const excelData = data.map(row => {
    const formattedRow: Record<string, any> = {};
    columns.forEach(col => {
      const value = row[col.key];
      // Formatar datas
      if (value instanceof Date) {
        formattedRow[col.header] = value.toLocaleString('pt-BR');
      } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        formattedRow[col.header] = new Date(value).toLocaleString('pt-BR');
      } else {
        formattedRow[col.header] = value ?? '';
      }
    });
    return formattedRow;
  });

  // Criar workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Definir largura das colunas
  const colWidths = columns.map(col => ({ wch: col.width || 20 }));
  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');

  // Gerar arquivo e fazer download
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
