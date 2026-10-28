import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { applyPixel, decodeSnapshot } from './board';
import type { Board, PixelEvent, Snapshot } from './board';

export function useBattle() {
  const [board, setBoard] = useState<Board | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  const [error, setError] = useState('');
  const [clockOffset, setClockOffset] = useState(0);
  const current = useRef<Board | null>(null);
  const syncRef = useRef<() => void>(() => {});

  const syncClock = useCallback((serverTime: number) => setClockOffset(serverTime - Date.now()), []);
  const acceptPixel = useCallback((event: PixelEvent) => {
    if (!current.current) { syncRef.current(); return; }
    const result = applyPixel(current.current, event);
    if (result.needsSync) { syncRef.current(); return; }
    if (result.board !== current.current) {
      current.current = result.board;
      setBoard(result.board);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    let attempts = 0;
    let fetching = false;
    let lastMessage = Date.now();
    const abort = new AbortController();

    const acceptSnapshot = (value: Snapshot) => {
      if (disposed) return;
      const decoded = decodeSnapshot(value);
      if (!current.current || decoded.revision >= current.current.revision) {
        current.current = decoded;
        setBoard(decoded);
      }
      syncClock(value.server_time);
      setError('');
    };
    const refresh = async () => {
      if (disposed || fetching) return;
      fetching = true;
      try { acceptSnapshot(await api<Snapshot>('/api/board', undefined, { signal: abort.signal })); }
      catch { if (!disposed) setError('Не удалось загрузить поле. Пробуем снова…'); }
      finally { fetching = false; }
    };
    syncRef.current = () => { void refresh(); };
    const connect = () => {
      if (disposed) return;
      if (!navigator.onLine) { setConnection('reconnecting'); return; }
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const candidate = new WebSocket(`${protocol}//${location.host}/api/ws`);
      socket = candidate;
      candidate.onopen = () => {
        if (disposed || candidate !== socket) { candidate.close(); return; }
        attempts = 0; lastMessage = Date.now(); setConnection('live');
      };
      candidate.onmessage = message => {
        if (candidate !== socket || disposed) return;
        lastMessage = Date.now();
        try {
          const event = JSON.parse(message.data);
          if (event.type === 'board.snapshot') acceptSnapshot(event);
          else if (event.type === 'pixel.changed') acceptPixel(event);
          else if (event.type === 'board.resync' ||
            (event.type === 'board.sync' && event.revision !== current.current?.revision)) void refresh();
        } catch { void refresh(); }
      };
      candidate.onclose = () => {
        if (disposed || candidate !== socket) return;
        setConnection('reconnecting');
        if (navigator.onLine) retry = window.setTimeout(connect, Math.min(1000 * 2 ** attempts++, 15000));
      };
      candidate.onerror = () => candidate.close();
    };
    connect();
    void refresh();
    const poll = window.setInterval(() => {
      if (!navigator.onLine) return;
      if (socket?.readyState !== WebSocket.OPEN) void refresh();
      else if (Date.now() - lastMessage > 12000) socket.close();
    }, 5000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onOffline = () => {
      window.clearTimeout(retry);
      setConnection('reconnecting');
      socket?.close();
    };
    const onOnline = () => {
      window.clearTimeout(retry);
      if (socket?.readyState !== WebSocket.OPEN && socket?.readyState !== WebSocket.CONNECTING) connect();
      void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      disposed = true;
      abort.abort();
      window.clearTimeout(retry);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      socket?.close();
      syncRef.current = () => {};
    };
  }, [acceptPixel, syncClock]);

  return { board, connection, error, clockOffset, syncClock, acceptPixel };
}
