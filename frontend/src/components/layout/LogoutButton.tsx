import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LogoutButton({
  className = '',
}: {
  className?: string
}) {
  const navigate = useNavigate()

  return (
    <>
      <button
        aria-label="Logout"
        className={`logout-button ${className}`.trim()}
        onClick={() => navigate('/logout')}
        type="button"
      >
        <LogOut size={17} aria-hidden="true" />
        <span>Logout</span>
      </button>
    </>
  )
}
