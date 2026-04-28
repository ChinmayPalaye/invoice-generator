import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { type InvoiceData, calcSubtotal, calcTotal, formatCurrency } from './types';
import './InvoicePreview.css';

interface Props {
  data: InvoiceData;
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function InvoicePreview({ data }: Props) {
  const sym = data.currencySymbol;
  const subtotal = calcSubtotal(data.items);
  const total = calcTotal(data.items, data.extraCharges);
  const hasExtras = data.extraCharges.some((c) => c.amount > 0);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data.upiId) {
      setQrDataUrl(null);
      return;
    }
    const upiUrl = `upi://pay?pa=${encodeURIComponent(data.upiId)}&cu=${data.currency}`;
    QRCode.toDataURL(upiUrl, { width: 90, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [data.upiId, data.currency]);

  return (
    <div className="preview-panel">
      <div className="invoice-page">
        {/* Left accent bar */}
        <div className="accent-bar" />

        {/* Title */}
        <h1 className="inv-title">I N V O I C E</h1>

        {/* Meta row */}
        <div className="meta-row">
          <div className="meta-item">
            <span className="meta-label">I N V O I C E &nbsp; N U M B E R :</span>
            <span className="meta-value">{data.invoiceNumber || '—'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">D A T E :</span>
            <span className="meta-value">{fmtDate(data.invoiceDate)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">D U E &nbsp; D A T E :</span>
            <span className="meta-value">{fmtDate(data.dueDate)}</span>
          </div>
        </div>

        {/* Addresses */}
        <div className="address-row">
          <div className="address-block">
            <h3 className="addr-label">B I L L &nbsp; T O :</h3>
            <p className="addr-value">{data.billToName || '—'}</p>
            <p className="addr-value addr-multiline">
              {data.billToAddress || '—'}
            </p>
          </div>
          <div className="address-block right">
            <h3 className="addr-label">P A Y A B L E &nbsp; T O :</h3>
            <p className="addr-value">{data.payableName || '—'}</p>
            <p className="addr-value">{data.payableLocation || ''}</p>
            <p className="addr-value">{data.payablePhone || ''}</p>
            <p className="addr-value">{data.payableEmail || ''}</p>
          </div>
        </div>

        {/* Subject */}
        <div className="towards-row">
          <span className="towards-text">
            Invoice towards : {data.invoiceTowards || '—'}
          </span>
        </div>

        {/* Items table */}
        <table className="items-table">
          <thead>
            <tr>
              <th className="t-no">N O .</th>
              <th className="t-qty">Q T Y</th>
              <th className="t-desc">D E S C R I P T I O N</th>
              <th className="t-price">P R I C E</th>
              <th className="t-total">T O T A L</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td className="t-no">{item.serialNo}</td>
                <td className="t-qty">{item.qty}</td>
                <td className="t-desc">{item.description || '—'}</td>
                <td className="t-price">{formatCurrency(item.price, sym)}</td>
                <td className="t-total">{formatCurrency(item.qty * item.price, sym)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Subtotal + Extra Charges + Total */}
        <div className="totals-block">
          {hasExtras && (
            <div className="totals-line">
              <span className="totals-label">s u b t o t a l :</span>
              <span>{formatCurrency(subtotal, sym)}</span>
            </div>
          )}
          {data.extraCharges.map((charge) =>
            charge.amount > 0 ? (
              <div className="totals-line" key={charge.id}>
                <span>{charge.label || 'Extra charge'}</span>
                <span>{formatCurrency(charge.amount, sym)}</span>
              </div>
            ) : null
          )}
          <div className="totals-line total-final">
            <span className="totals-label">T O T A L &nbsp; A M O U N T :</span>
            <span className="total-value">{formatCurrency(total, sym)}/-</span>
          </div>
        </div>

        {/* Account Details */}
        <div className="account-section">
          <h3 className="section-heading">A C C O U N T &nbsp; D E T A I L S</h3>
          <div className="account-row">
            <div className="account-col">
              <p>Name : {data.accountName || '—'}</p>
              <p>Account number : {data.accountNumber || '—'}</p>
              <p>IFSC : {data.ifsc || '—'}</p>
              <p>Bank Name : {data.bankName || '—'}</p>
            </div>
            <div className="account-col right">
              {qrDataUrl && (
                <div className="qr-block">
                  <img src={qrDataUrl} alt="UPI QR Code" className="qr-img" />
                  <span className="qr-label">Scan to Pay</span>
                </div>
              )}
              <p className="signoff-name">{data.payableName || ''}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-note">
          {data.footerNote}
        </div>
      </div>
    </div>
  );
}
