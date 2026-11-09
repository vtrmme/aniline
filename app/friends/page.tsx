"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

interface Friend {
  id: string
  friend_id: string
  email: string
  status: string
  created_at: string
}

interface PendingRequest {
  id: string
  from_user_id?: string
  to_user_id?: string
  from_email?: string
  to_email?: string
  email: string
  status: string
  created_at: string
}

export default function FriendsPage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingIncoming, setPendingIncoming] = useState<PendingRequest[]>([])
  const [pendingOutgoing, setPendingOutgoing] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newFriendEmail, setNewFriendEmail] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadFriends = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/friends")
      if (res.ok) {
        const json = await res.json()
        setFriends(json.friends || [])
        setPendingIncoming(json.pending_incoming || [])
        setPendingOutgoing(json.pending_outgoing || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFriends()
  }, [lang])

  const addFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFriendEmail.trim()) return
    setAdding(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_email: newFriendEmail }),
      })
      if (res.ok) {
        setSuccessMsg("Solicitud de amistad enviada")
        setNewFriendEmail("")
        loadFriends()
      } else {
        const json = await res.json()
        setErrorMsg(json.error || "Error al enviar solicitud")
      }
    } catch {
      setErrorMsg("Error de red al enviar solicitud")
    } finally {
      setAdding(false)
    }
  }

  const respondToRequest = async (requestId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/friends/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setSuccessMsg(action === "accept" ? "Amistad aceptada" : "Solicitud rechazada")
        loadFriends()
      } else {
        const json = await res.json()
        setErrorMsg(json.error || "Error al responder solicitud")
      }
    } catch {
      setErrorMsg("Error de red al responder solicitud")
    }
  }

  const viewFriendList = (friendId: string) => {
    const friend = friends.find((f) => f.friend_id === friendId)
    if (friend) {
      router.push(`/lista?user_id=${friend.friend_id}&email=${encodeURIComponent(friend.email)}`)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400">
        <div className="animate-pulse rounded-full h-12 w-12 bg-gray-800 mx-auto mb-4"></div>
        {t(lang, "myListTitle")}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Amigos</h1>
        <Link
          href="/lista"
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
        >
          ← {t(lang, "myListTitle")}
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-red-600/20 border border-red-600/30 text-red-100 text-sm">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 rounded-lg bg-green-600/20 border border-green-600/30 text-green-100 text-sm">
          {successMsg}
        </div>
      )}

      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Agregar amigo</h2>
        <form onSubmit={addFriend} className="flex gap-3">
          <input
            type="email"
            placeholder="Email de tu amigo"
            value={newFriendEmail}
            onChange={(e) => setNewFriendEmail(e.target.value)}
            className="flex-1 pl-4 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-red-600 transition"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-6 py-3 text-white bg-red-600 hover:bg-red-700 rounded-xl font-medium transition disabled:opacity-50"
          >
            {adding ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      </div>

      {friends.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            {t(lang, "myListTitle")} de tus amigos ({friends.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">{friend.email}</p>
                    <p className="text-xs text-green-400">
                      Amigo desde {new Date(friend.created_at).toLocaleDateString(
                        lang === "es" ? "es-ES" : "en-US"
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => viewFriendList(friend.friend_id)}
                    className="text-sm text-red-600 hover:text-red-400 underline underline-offset-4"
                  >
                    {lang === "es" ? "Ver lista" : "View list"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingIncoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Solicitudes de amistad ({pendingIncoming.length})
          </h2>
          <div className="space-y-3">
            {pendingIncoming.map((req) => (
              <div
                key={req.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-white">{req.from_email}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(req.created_at).toLocaleDateString(
                      lang === "es" ? "es-ES" : "en-US"
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToRequest(req.id, "accept")}
                    className="px-4 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition"
                  >
                    {lang === "es" ? "Aceptar" : "Accept"}
                  </button>
                  <button
                    onClick={() => respondToRequest(req.id, "reject")}
                    className="px-4 py-2 text-xs font-medium text-white bg-gray-700 hover:bg-gray-600 rounded transition"
                  >
                    {lang === "es" ? "Rechazar" : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingOutgoing.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Solicitudes enviadas ({pendingOutgoing.length})
          </h2>
          <div className="space-y-3">
            {pendingOutgoing.map((req) => (
              <div
                key={req.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-white">{req.to_email}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(req.created_at).toLocaleDateString(
                      lang === "es" ? "es-ES" : "en-US"
                    )}
                  </p>
                </div>
                <span className="text-xs text-yellow-400">
                  {lang === "es" ? "Pendiente" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {friends.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p>
            {lang === "es"
              ? "No tienes amigos aún. Agrega a alguien por email."
              : "No friends yet. Add someone by email."}
          </p>
        </div>
      )}
    </div>
  )
}
