export interface LineItem {
  id: string;
  serialNo: string;
  description: string;
  qty: number;
  price: number;
}

export interface ExtraCharge {
  id: string;
  label: string;
  amount: number;
}

export interface InvoiceData {
  // Header
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;

  // Subject
  invoiceTowards: string;

  // Bill To
  billToName: string;
  billToAddress: string;

  // Payable To
  payableName: string;
  payableLocation: string;
  payablePhone: string;
  payableEmail: string;

  // Line Items
  items: LineItem[];

  // Extra Charges
  extraCharges: ExtraCharge[];

  // Account Details
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  upiId: string;

  // Currency
  currency: string;
  currencySymbol: string;

  // Footer note
  footerNote: string;
}

export const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
] as const;

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyInvoice(): InvoiceData {
  return {
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    invoiceTowards: '',
    billToName: '',
    billToAddress: '',
    payableName: '',
    payableLocation: '',
    payablePhone: '',
    payableEmail: '',
    items: [{ id: uid(), serialNo: '1.', description: '', qty: 1, price: 0 }],
    extraCharges: [],
    accountName: '',
    accountNumber: '',
    ifsc: '',
    bankName: '',
    upiId: '',
    currency: 'INR',
    currencySymbol: '₹',
    footerNote: 'HOPE YOU ENJOY YOUR ORDER!',
  };
}

export function calcSubtotal(items: LineItem[]): number {
  return items.reduce((sum, it) => sum + it.qty * it.price, 0);
}

export function calcExtraTotal(charges: ExtraCharge[]): number {
  return charges.reduce((sum, c) => sum + c.amount, 0);
}

export function calcTotal(items: LineItem[], charges: ExtraCharge[]): number {
  return calcSubtotal(items) + calcExtraTotal(charges);
}

export function getUpiUrl(data: InvoiceData): string {
  const total = calcTotal(data.items, data.extraCharges);
  return `upi://pay?pa=${encodeURIComponent(data.upiId)}&cu=${data.currency}&tn=${data.invoiceTowards}&am=${total}`;
}

export function formatCurrency(amount: number, symbol: string): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${symbol}${formatted}`;
}
