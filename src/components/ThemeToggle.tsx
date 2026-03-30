import { Moon, Sun } from 'lucide-react'

interface Props {
  dark: boolean
  onToggle: () => void
}

export default function ThemeToggle({ dark, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  )
}
