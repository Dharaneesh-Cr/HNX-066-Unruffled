import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  to?: string
  variant?: 'primary' | 'secondary' | 'quiet'
}

export default function Button({
  children,
  to,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const classes = `button button-${variant} ${className}`.trim()
  if (to) {
    return (
      <Link className={classes} to={to}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} type="button" {...props}>
      {children}
    </button>
  )
}
