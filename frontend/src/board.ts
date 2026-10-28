export type Point = { x: number; y: number };
export type Board = {
  size: number;
  palette: string[];
  pixels: Uint8Array;
  revision: number;
  cooldown_seconds: number;
};
export type Snapshot = Omit<Board, 'pixels'> & { type: 'board.snapshot'; pixels: string; server_time: number };
export type PixelEvent = Point & { type: 'pixel.changed'; color: number; revision: number };

export function decodeSnapshot(snapshot: Snapshot): Board {
  const bytes = Uint8Array.from(atob(snapshot.pixels), char => char.charCodeAt(0));
  if (snapshot.size !== 256 || bytes.length !== snapshot.size ** 2 || snapshot.palette.length !== 32 ||
      bytes.some(color => color >= snapshot.palette.length)) {
    throw new Error('Сервер прислал некорректное поле');
  }
  return { ...snapshot, pixels: bytes };
}

export function applyPixel(board: Board, event: PixelEvent): { board: Board; needsSync: boolean } {
  if (event.revision <= board.revision) return { board, needsSync: false };
  if (event.revision !== board.revision + 1 || event.x < 0 || event.x >= board.size ||
      event.y < 0 || event.y >= board.size || event.color < 0 || event.color >= board.palette.length) {
    return { board, needsSync: true };
  }
  const pixels = board.pixels.slice();
  pixels[event.y * board.size + event.x] = event.color;
  return { board: { ...board, pixels, revision: event.revision }, needsSync: false };
}
