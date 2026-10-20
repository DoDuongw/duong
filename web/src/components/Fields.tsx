import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  /** id của ô nhập để bấm nhãn là focus đúng ô (a11y) */
  htmlFor?: string;
}

/** Khung nhãn + input + lỗi ngay dưới trường (yêu cầu M05/INTERFACE_SPEC) */
export function Field({ label, error, hint, children, htmlFor }: FieldProps) {
  return (
    <div style={{ display: 'block', marginBottom: 16 }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'block',
          fontSize: 'calc(17px * var(--font-mult))',
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <span
          style={{ display: 'block', color: 'var(--c-muted)', fontSize: 'calc(15px * var(--font-mult))', marginTop: 4 }}
        >
          {hint}
        </span>
      )}
      {error && (
        <span
          role="alert"
          style={{
            display: 'block',
            color: 'var(--c-danger)',
            fontSize: 'calc(15px * var(--font-mult))',
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

interface DateFieldProps {
  label: string;
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  min?: string;
  max?: string;
  required?: boolean;
  id?: string;
}

export function DateField({ label, value, onChange, error, hint, min, max, required, id }: DateFieldProps) {
  return (
    <Field label={required ? `${label} *` : label} error={error} hint={hint} htmlFor={id}>
      <input
        id={id}
        className="input"
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

interface TimeFieldProps {
  label: string;
  value: string; // HH:mm
  onChange: (value: string) => void;
  error?: string | null;
  required?: boolean;
  id?: string;
}

export function TimeField({ label, value, onChange, error, required, id }: TimeFieldProps) {
  return (
    <Field label={required ? `${label} *` : label} error={error} htmlFor={id}>
      <input
        id={id}
        className="input"
        type="time"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** Nhãn + ô nhập cho select (dùng ở M06/M08) */
export function SelectField({
  label,
  value,
  onChange,
  children,
  id,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  id?: string;
  hint?: string;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </Field>
  );
}

/** Ô input text/email/password dùng chung */
export function TextField({
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  required,
  autoComplete,
  placeholder,
  id,
}: {
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  id?: string;
}) {
  return (
    <Field label={required ? `${label} *` : label} error={error} hint={hint} htmlFor={id}>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
