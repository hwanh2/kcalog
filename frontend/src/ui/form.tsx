import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

/** 카드 표면 — 모서리·그림자·패딩·배경을 한 곳에서 관리 (위치 여백은 호출측 className으로) */
/** id는 앱 둘러보기가 비출 자리를 찾는 데 쓴다(add-app-tutorial design D2) */
export function Card({
  id,
  className = '',
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div id={id} className={`rounded-card bg-surface p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

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

/* 포커스 표시는 테두리 색 변화가 아니라 링으로 준다 — 1px 색 변화는 눈에 띄지 않는다.
   focus-visible이라 마우스 클릭에는 링이 뜨지 않고 키보드 이동에만 뜬다. */
const controlClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none focus-visible:border-brand-ink focus-visible:ring-2 focus-visible:ring-brand-ink/40'

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
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-brand text-on-brand hover:bg-brand-dark disabled:opacity-50',
    secondary: 'border border-border bg-surface text-ink hover:bg-canvas disabled:opacity-50',
    ghost: 'text-muted hover:text-ink',
    // 되돌릴 수 없는 실행 — 빨간 글씨만으로는 버튼인지 안 읽혔다(2026-08-15 결정)
    danger: 'bg-danger text-on-brand hover:brightness-110 disabled:opacity-50',
  }[variant]
  // 라운드는 tile(12px) — 입력 필드(md)보다 둥글게 둬 누를 것과 채울 것을 구분한다
  // press — 모바일에는 hover가 없어 누른 순간 아무 반응이 없었다. 살짝 눌리면 닿은 게 읽힌다.
  // 움직임 줄이기에서는 밝기로 답한다(index.css) — 전역 블록은 전환 시간만 지워 그대로 두면 튄다
  return (
    <button
      {...props}
      className={`press rounded-tile px-4 py-2 text-sm font-medium touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink ${styles} ${className}`}
    />
  )
}
