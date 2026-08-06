import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

/** 라벨 + 입력 + 오류를 묶는 필드 래퍼 — 폼 전반의 간격·오류 표시를 일관화한다 */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const controlClass =
  'w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-ink outline-none focus:border-brand'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={controlClass} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={controlClass} />
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-dark disabled:opacity-50',
    secondary: 'border border-gray-300 bg-surface text-ink hover:bg-canvas disabled:opacity-50',
    ghost: 'text-muted hover:text-ink',
  }[variant]
  return (
    <button {...props} className={`rounded-md px-4 py-2 text-sm font-medium ${styles} ${className}`} />
  )
}
