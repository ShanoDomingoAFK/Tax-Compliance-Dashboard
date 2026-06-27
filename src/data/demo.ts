import { VATCategory, ATCEntry, Supplier } from '../types';

export const COMPANY_PROFILE = {
  tin: '008737954',
  filingType: 'P',
  registeredName: 'LOCANDSTOR 247 INC',
  lastName: '',
  firstName: '',
  middleName: '',
  tradeName: 'LOCSTOR 247 INC',
  address: '54 E RODRIGUEZ JR AVE BRGY BAGONG ILOG',
  cityZip: 'PASIG CITY NCR 1604',
  branchCode: '043',
  taxRateCode: '12',
  bookName: 'LOC&STOR 24/7, INC.',
  bookAddress: '54 E RODRIGUEZ JR AVE BRGY BAGONG ILOG PASIG CITY NCR 1604',
  bookTin: '008-737-954-043',
  permitToUseNo: 'XXXXXXXXXXXX'
};

export const demoVatCategories: VATCategory[] = [
  { _id: 'vc_1', code: 'S', label: 'Vatable services', kind: 'VAT Registered', rate: 12, status: 'locked' },
  { _id: 'vc_2', code: 'G', label: 'Vatable goods', kind: 'VAT Registered', rate: 12, status: 'locked' },
  { _id: 'vc_3', code: 'I', label: 'Vatable importation', kind: 'VAT Registered', rate: 12, status: 'locked' },
  { _id: 'vc_4', code: 'CG', label: 'Vatable capital goods', kind: 'VAT Registered', rate: 12, status: 'locked' },
  { _id: 'vc_5', code: 'SNQ', label: 'Non-VAT services', kind: 'Non-VAT', rate: 0, status: 'locked' },
  { _id: 'vc_6', code: 'GNQ', label: 'Non-VAT goods', kind: 'Non-VAT', rate: 0, status: 'locked' }
];

export const demoAtcMaster: ATCEntry[] = [
  { _id: 'atc_1', atcCode: 'WC 160', rate: 2, description: 'Professional fees / service payment', source: '2307 reference table', status: 'active' },
  { _id: 'atc_2', atcCode: 'WI 160', rate: 2, description: 'Service payment - individual', source: '2307 reference table', status: 'active' },
  { _id: 'atc_3', atcCode: 'WC 158', rate: 1, description: 'Goods payment to top withholding agents', source: '2307 reference table', status: 'active' },
  { _id: 'atc_4', atcCode: 'WI 158', rate: 1, description: 'Goods payment to individuals', source: '2307 reference table', status: 'active' }
];

export const demoSupplierMaster: Supplier[] = [
  { _id: 'sup_1', tin: '123-456-789-000', registeredName: 'Supplier A Corporation', lastName: '', firstName: '', middleName: '', address: '100 Ayala Avenue', city: 'Makati City', zip: '1226' },
  { _id: 'sup_2', tin: '234-567-890-000', registeredName: 'Supplier B Services', lastName: '', firstName: '', middleName: '', address: '12 Shaw Boulevard', city: 'Mandaluyong City', zip: '1550' },
  { _id: 'sup_3', tin: '345-678-901-000', registeredName: 'Supplier C Trading', lastName: '', firstName: '', middleName: '', address: '88 Quezon Avenue', city: 'Quezon City', zip: '1100' },
  { _id: 'sup_4', tin: '456-789-012-000', registeredName: '', lastName: 'Dela Cruz', firstName: 'Juan', middleName: 'Santos', address: '45 Mabini Street', city: 'Manila', zip: '1000' },
  { _id: 'sup_5', tin: '567-890-123-000', registeredName: 'Supplier Y Inc.', lastName: '', firstName: '', middleName: '', address: '9 Rizal Drive', city: 'Taguig City', zip: '1634' }
];
