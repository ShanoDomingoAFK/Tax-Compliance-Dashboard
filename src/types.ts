export interface Transaction {
  _id: string;
  voucherName: string;
  supplier: string;
  tin: string;
  cv: string;
  inv: string;
  date: string;
  description: string;
  amount: number;
  vatable: number;
  nonVatable: number;
  vat: number;
  total: number;
  vatCategory: string;
  vatReg: 'VAT-reg' | 'Non-VAT';
  ewtAmount: number;
  atcCode: string;
  manualStatus: 'unreviewed' | 'ok' | 'warn' | 'err' | 'journal' | 'adjusting';
  reviewNote: string;
  lastReviewed: string;
  accountingTitle: string;
  bankAccount: string;
  registeredName: string;
  lastName: string;
  firstName: string;
  middleName: string;
  address: string;
  city: string;
  zip: string;
  supplierManualOverride: boolean;
}

export interface LedgerRow {
  _id: string;
  cv: string;
  supplier: string;
  date: string;
  amount: number;
  account: string;
  ref: string;
  type: 'vat' | 'ewt';
}

export interface Supplier {
  _id: string;
  tin: string;
  registeredName: string;
  lastName: string;
  firstName: string;
  middleName: string;
  address: string;
  city: string;
  zip: string;
  status?: string;
}

export interface ATCEntry {
  _id: string;
  atcCode: string;
  rate: number | null;
  description: string;
  source: string;
  status: string;
}

export interface VATCategory {
  _id: string;
  code: string;
  label: string;
  kind: string;
  rate: number;
  status: string;
}

export interface MonthInfo {
  key: string;
  label: string;
  order: number;
}

export interface YearInfo {
  year: string;
  order: number;
}
