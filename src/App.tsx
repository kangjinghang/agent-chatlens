import { useState, useCallback } from 'react'
import { FileText, X } from 'lucide-react'
import { parseSession } from './parser'
import type { ParsedSession } from './parser'
import DropZone from './components/DropZone'
import SessionList from './components/SessionList'
import ThemeToggle from './components/ThemeToggle'

export default function App() {
  const [session, setSession] = useState<ParsedSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleTheme = useCallback(() => {
    setDark(prev => {
      document.documentElement.classList.toggle('dark', !prev)
      return !prev
    })
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setLoading(true)
    setError('')
    try {
      const text = await file.text()
      const result = parseSession(text, file.name)
      if (result.messages.length === 0) {
        setError('No displayable messages found in this file.')
      }
      setSession(result)
    } catch (err) {
      setError('Failed to parse file: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReset = useCallback(() => {
    setSession(null)
    setError('')
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Agent ChatLens</h1>
          </div>
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {session ? (
          <div className="space-y-4">
            {/* Info bar */}
            <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-4">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">{session.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {session.format} · {session.messages.length} messages
                    {session.createdAt && <> · {new Date(session.createdAt).toLocaleString()}</>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>

            <SessionList session={session} />
          </div>
        ) : (
          <DropZone onFile={handleFile} loading={loading} />
        )}

        {/* Error */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-6 py-4 rounded-lg shadow-lg z-50 max-w-md">
            <p>{error}</p>
            <button onClick={() => setError('')} className="mt-2 text-sm underline">
              Close
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
