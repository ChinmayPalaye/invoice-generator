import { type InvoiceData, type LineItem, type ExtraCharge, CURRENCIES, uid } from './types';
import './InvoiceForm.css';

interface Props {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  onReset: () => void;
  onExport: () => void;
  errors: Record<string, string>;
}

export default function InvoiceForm({ data, onChange, onReset, onExport, errors }: Props) {
  const set = <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) =>
    onChange({ ...data, [key]: value });

  const setItem = (id: string, patch: Partial<LineItem>) => {
    const items = data.items.map((it) => (it.id === id ? { ...it, ...patch } : it));
    onChange({ ...data, items });
  };

  const addItem = () => {
    const nextNo = data.items.length + 1;
    onChange({
      ...data,
      items: [
        ...data.items,
        { id: uid(), serialNo: `${nextNo}.`, description: '', qty: 1, price: 0 },
      ],
    });
  };

  const removeItem = (id: string) => {
    if (data.items.length <= 1) return;
    const items = data.items
      .filter((it) => it.id !== id)
      .map((it, i) => ({ ...it, serialNo: `${i + 1}.` }));
    onChange({ ...data, items });
  };

  const setCharge = (id: string, patch: Partial<ExtraCharge>) => {
    const extraCharges = data.extraCharges.map((c) => (c.id === id ? { ...c, ...patch } : c));
    onChange({ ...data, extraCharges });
  };

  const addCharge = () => {
    onChange({
      ...data,
      extraCharges: [...data.extraCharges, { id: uid(), label: '', amount: 0 }],
    });
  };

  const removeCharge = (id: string) => {
    onChange({ ...data, extraCharges: data.extraCharges.filter((c) => c.id !== id) });
  };

  const handleCurrency = (code: string) => {
    const c = CURRENCIES.find((c) => c.code === code);
    if (c) onChange({ ...data, currency: c.code, currencySymbol: c.symbol });
  };

  const handleReset = () => {
    if (window.confirm('Reset all fields to defaults?')) onReset();
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="form-panel">
      <header className="form-header">
        <span className="form-title">Invoice Generator</span>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset
          </button>
          <button className="btn btn-primary" onClick={onExport} disabled={hasErrors}>
            Download PDF
          </button>
        </div>
      </header>

      <div className="form-body">
        {/* Invoice Details */}
        <fieldset>
          <legend>Invoice Details</legend>
          <div className="field-row three-col">
            <label>
              Invoice #
              <input
                value={data.invoiceNumber}
                onChange={(e) => set('invoiceNumber', e.target.value)}
                placeholder="INV-001"
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={data.invoiceDate}
                onChange={(e) => set('invoiceDate', e.target.value)}
              />
              {errors.invoiceDate && <span className="field-error">{errors.invoiceDate}</span>}
            </label>
            <label>
              Due Date
              <input
                type="date"
                value={data.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
              {errors.dueDate && <span className="field-error">{errors.dueDate}</span>}
            </label>
          </div>
          <label>
            Invoice Towards
            <input
              value={data.invoiceTowards}
              onChange={(e) => set('invoiceTowards', e.target.value)}
              placeholder="Design services for Q1"
            />
          </label>
        </fieldset>

        {/* Bill To */}
        <fieldset>
          <legend>Bill To</legend>
          <label>
            Name / Company
            <input
              value={data.billToName}
              onChange={(e) => set('billToName', e.target.value)}
              placeholder="Company Name"
            />
          </label>
          <label>
            Address
            <textarea
              rows={3}
              value={data.billToAddress}
              onChange={(e) => set('billToAddress', e.target.value)}
              placeholder="123 Main Street&#10;City, State 12345"
            />
          </label>
        </fieldset>

        {/* Payable To */}
        <fieldset>
          <legend>Payable To</legend>
          <label>
            Name
            <input
              value={data.payableName}
              onChange={(e) => set('payableName', e.target.value)}
              placeholder="Your Name"
            />
          </label>
          <label>
            Location
            <input
              value={data.payableLocation}
              onChange={(e) => set('payableLocation', e.target.value)}
              placeholder="City, Country"
            />
          </label>
          <label>
            Phone
            <input
              type="tel"
              value={data.payablePhone}
              onChange={(e) => set('payablePhone', e.target.value)}
              placeholder="+1 234 567 8900"
            />
            {errors.payablePhone && <span className="field-error">{errors.payablePhone}</span>}
          </label>
          <label>
            Email
            <input
              type="email"
              value={data.payableEmail}
              onChange={(e) => set('payableEmail', e.target.value)}
              placeholder="email@example.com"
            />
            {errors.payableEmail && <span className="field-error">{errors.payableEmail}</span>}
          </label>
        </fieldset>

        {/* Line Items */}
        <fieldset>
          <legend>Items</legend>
          <div className="items-header">
            <span className="col-no">No.</span>
            <span className="col-desc">Description</span>
            <span className="col-qty">Qty</span>
            <span className="col-price">Price</span>
            <span className="col-action"></span>
          </div>
          {data.items.map((item) => (
            <div className="item-row" key={item.id}>
              <input
                className="col-no"
                value={item.serialNo}
                onChange={(e) => setItem(item.id, { serialNo: e.target.value })}
              />
              <input
                className="col-desc"
                value={item.description}
                onChange={(e) => setItem(item.id, { description: e.target.value })}
                placeholder="Item description"
              />
              <input
                className="col-qty"
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => setItem(item.id, { qty: Math.max(1, Number(e.target.value)) })}
              />
              <input
                className="col-price"
                type="number"
                min={0}
                value={item.price || ''}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setItem(item.id, { price: v >= 0 ? v : 0 });
                }}
                placeholder="0"
              />
              <button
                className="btn-icon"
                onClick={() => removeItem(item.id)}
                disabled={data.items.length <= 1}
                title="Remove item"
                aria-label={`Remove item ${item.serialNo}`}
              >
                ×
              </button>
            </div>
          ))}
          <button className="btn btn-small" onClick={addItem}>
            + Add Item
          </button>
          {errors.items && <span className="field-error">{errors.items}</span>}
        </fieldset>

        {/* Extra Charges */}
        <fieldset>
          <legend>Extra Charges</legend>
          {data.extraCharges.map((charge) => (
            <div className="field-row two-col" key={charge.id}>
              <label>
                Label
                <input
                  value={charge.label}
                  onChange={(e) => setCharge(charge.id, { label: e.target.value })}
                  placeholder="Shipping, handling, etc."
                />
              </label>
              <label>
                Amount
                <div className="input-with-action">
                  <input
                    type="number"
                    min={0}
                    value={charge.amount || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCharge(charge.id, { amount: v >= 0 ? v : 0 });
                    }}
                    placeholder="0"
                  />
                  <button
                    className="btn-icon"
                    onClick={() => removeCharge(charge.id)}
                    title="Remove charge"
                    aria-label={`Remove ${charge.label || 'charge'}`}
                  >
                    ×
                  </button>
                </div>
              </label>
            </div>
          ))}
          <button className="btn btn-small" onClick={addCharge}>
            + Add Charge
          </button>
        </fieldset>

        {/* Currency */}
        <fieldset>
          <legend>Currency</legend>
          <select value={data.currency} onChange={(e) => handleCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
        </fieldset>

        {/* Account Details */}
        <fieldset>
          <legend>Account Details</legend>
          <label>
            Account Holder Name
            <input
              value={data.accountName}
              onChange={(e) => set('accountName', e.target.value)}
              placeholder="John Doe"
            />
          </label>
          <label>
            Account Number
            <input
              value={data.accountNumber}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                set('accountNumber', v);
              }}
              placeholder="1234567890"
            />
            {errors.accountNumber && <span className="field-error">{errors.accountNumber}</span>}
          </label>
          <label>
            IFSC
            <input
              value={data.ifsc}
              onChange={(e) => set('ifsc', e.target.value.toUpperCase())}
              placeholder="ABCD0123456"
            />
          </label>
          <label>
            Bank Name
            <input
              value={data.bankName}
              onChange={(e) => set('bankName', e.target.value)}
              placeholder="Bank Name"
            />
          </label>
          <label>
            UPI ID
            <input
              value={data.upiId}
              onChange={(e) => set('upiId', e.target.value)}
              placeholder="name@upi"
            />
            <span className="field-hint">A QR code will be shown on the invoice</span>
          </label>
        </fieldset>

        {/* Footer Note */}
        <fieldset>
          <legend>Footer Note</legend>
          <input
            value={data.footerNote}
            onChange={(e) => set('footerNote', e.target.value)}
            placeholder="Thank you for your business!"
          />
        </fieldset>
      </div>
    </div>
  );
}
