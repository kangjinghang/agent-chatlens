import { useCallback } from 'react'
import { Upload, FileText, FolderOpen } from 'lucide-react'

interface Props {
  onFile: (file: File, handle?: FileSystemFileHandle) => void
  loading: boolean
}

export default function DropZone({ onFile, loading }: Props) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleFilePicker = useCallback(async () => {
    if (!('showOpenFilePicker' in window)) {
      document.getElementById('file-input')?.click()
      return
    }

    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'JSONL Files',
            accept: { 'application/jsonl': ['.jsonl'] },
          },
        ],
      })
      const file = await handle.getFile()
      onFile(file, handle)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('File picker error:', err)
      }
    }
  }, [onFile])

  if (loading) {
    return (
      <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Parsing session...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('file-input')?.click()}
        className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer"
      >
        <input id="file-input" type="file" accept=".jsonl" onChange={handleChange} className="hidden" />
        <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Drop JSONL file here</h2>
        <p className="text-muted-foreground mb-4">or click to select</p>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" /> OpenClaw
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" /> Claude Code
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-border" />
        <span className="text-sm text-muted-foreground">or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <button
        onClick={handleFilePicker}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
      >
        <FolderOpen className="h-5 w-5" />
        Open with File Picker
        <span className="text-xs opacity-70 ml-1">(supports reload)</span>
      </button>
    </div>
  )
}
