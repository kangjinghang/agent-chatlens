import { AlertCircle } from 'lucide-react'
import type { ParsedSession } from '../parser'
import MessageItem from './MessageItem'

interface Props {
  session: ParsedSession
}

export default function SessionList({ session }: Props) {
  if (session.messages.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No displayable messages found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {session.messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  )
}
