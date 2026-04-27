declare module 'xlsx-populate' {
  export interface Workbook {
    sheet(index: number): Sheet;
    sheet(name: string): Sheet;
  }

  export interface Sheet {
    usedRange(): Range | null;
    cell(row: number, col: number): Cell;
  }

  export interface Range {
    startCell(): Cell;
    endCell(): Cell;
  }

  export interface Cell {
    rowNumber(): number;
    columnNumber(): number;
    value(): any;
  }

  export function fromDataAsync(data: Buffer, options?: { password?: string }): Promise<Workbook>;
}