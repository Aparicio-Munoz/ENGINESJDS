import { useContext } from 'react'
import { SocketContext } from '../context/SocketContextValue'

export function useSocket() {
  return useContext(SocketContext)
}
