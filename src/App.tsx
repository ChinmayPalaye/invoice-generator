import { useState, useCallback, useMemo } from 'react';
import { type InvoiceData, emptyInvoice, uid } from './types';
import InvoiceForm from './InvoiceForm';
import InvoicePreview from './InvoicePreview';
import { generatePdf, downloadPdf } from './pdfExport';
import './App.css';

const LS_KEY = 'invoice-generator-draft';

function loadDraft(): InvoiceData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...emptyInvoice(), ...parsed };
      // Migrate old single shipping field to extraCharges
      if (!parsed.extraCharges && parsed.shippingCharges > 0) {
        merged.extraCharges = [{ id: uid(), label: parsed.shippingLabel || 'Shipping', amount: parsed.shippingCharges }];
      }
      delete merged.shippingCharges;
      delete merged.shippingLabel;
      return merged;
    }
  } catch { /* ignore */ }
  return emptyInvoice();
}

function saveDraft(data: InvoiceData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function validate(data: InvoiceData): Record<string, string> {
  const errs: Record<string, string> = {};

  if (data.invoiceDate && data.dueDate && data.dueDate < data.invoiceDate) {
    errs.dueDate = 'Must be after invoice date';
  }

  if (data.payableEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.payableEmail)) {
    errs.payableEmail = 'Invalid email format';
  }

  if (data.payablePhone && !/^\+?[\d\s\-()]+$/.test(data.payablePhone)) {
    errs.payablePhone = 'Invalid phone number';
  }

  if (data.accountNumber && /\D/.test(data.accountNumber)) {
    errs.accountNumber = 'Numbers only';
  }

  if (data.items.length > 12) {
    errs.items = 'Max 12 items for single-page layout';
  }

  return errs;
}

export default function App() {
  const [data, setData] = useState<InvoiceData>(loadDraft);

  const errors = useMemo(() => validate(data), [data]);

  const handleChange = useCallback((next: InvoiceData) => {
    setData(next);
    saveDraft(next);
  }, []);

  const handleReset = useCallback(() => {
    const fresh = emptyInvoice();
    setData(fresh);
    saveDraft(fresh);
  }, []);

  const handleExport = useCallback(async () => {
    if (Object.keys(errors).length > 0) return;
    const bytes = await generatePdf(data);
    const filename = data.invoiceNumber
      ? `${data.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
      : 'invoice.pdf';
    downloadPdf(bytes, filename);
  }, [data, errors]);

  return (
    <div className="app-shell">
      <InvoiceForm
        data={data}
        onChange={handleChange}
        onReset={handleReset}
        onExport={handleExport}
        errors={errors}
      />
      <InvoicePreview data={data} />
    </div>
  );
}
