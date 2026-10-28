import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert, Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogTitle,
  Input, Label, PixelIcon, Progress, Skeleton, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@pixel-kit/react';
import { api, ApiError } from './api';
import type { PixelEvent, Point } from './board';
import { PixelCanvas } from './PixelCanvas';
import { useBattle } from './useBattle';

type User = { id: string; email: string; next_pixel_at: number };
type AuthResult = { user: User; server_time: number };
type Placement = Point & { color: number; changed: boolean; revision: number; next_pixel_at: number; server_time: number };

function PixelFlower() {
  return <svg viewBox="0 0 96 96" fill="none" shapeRendering="crispEdges" className="pixel-flower" aria-hidden="true">
    <path fill="#49332f" d="M32 4h16v8h16v8h8v24h-8v8H48v8H32v-8H16v-8H8V20h8v-8h16z" />
    <path fill="#efc85c" d="M32 12h16v8h16v24H48v8H32v-8H16V20h16z" />
    <path fill="#ee7f73" d="M32 24h16v16H32z" />
    <path fill="#49332f" d="M36 52h8v36h-8zM44 64h16v-8h16v16H60v8H44zM20 60h8v8h8v12H20v-8h-8V60z" />
    <path fill="#68b5ac" d="M44 68h16v-4h8v4h-8v4H44zM20 64h4v8h12v4H24v-4h-4z" />
    <path fill="#49332f" d="M28 84h24v8H28zM76 20h4v4h-4zM84 28h4v4h-4zM0 48h4v4H0z" />
  </svg>;
}

function AuthDialog({ open, onOpenChange, onAuth }: {
  open: boolean; onOpenChange: (open: boolean) => void; onAuth: (value: AuthResult) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await api<AuthResult>(`/api/auth/${mode}`, { email: email.trim(), password });
      onAuth(result); setPassword(''); onOpenChange(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось войти'); }
    finally { setLoading(false); }
  };

  return <Dialog open={open} onOpenChange={value => { setError(''); onOpenChange(value); }}>
    <DialogContent className="auth-dialog">
      <div className="dialog-emblem"><PixelIcon name="cursor" size={32} /></div>
      <DialogTitle>{mode === 'register' ? 'Ваш первый пиксель' : 'С возвращением!'}</DialogTitle>
      <DialogDescription>{mode === 'register'
        ? 'Создайте аккаунт и оставьте свой след на общем полотне.'
        : 'Войдите, чтобы продолжить рисовать вместе.'}</DialogDescription>
      <div className="auth-tabs" role="group" aria-label="Вход или регистрация">
        <Button variant={mode === 'register' ? 'primary' : 'ghost'} onClick={() => { setMode('register'); setError(''); }}>Регистрация</Button>
        <Button variant={mode === 'login' ? 'primary' : 'ghost'} onClick={() => { setMode('login'); setError(''); }}>Вход</Button>
      </div>
      <form onSubmit={event => void submit(event)}>
        <div className="form-field"><Label htmlFor="auth-email">Email</Label>
          <Input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254}
            placeholder="you@example.com" required value={email} onChange={event => setEmail(event.target.value)} />
        </div>
        <div className="form-field"><Label htmlFor="auth-password">Пароль</Label>
          <Input id="auth-password" name="password" type="password" minLength={8} maxLength={128}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            placeholder="Не меньше 8 символов" required value={password} onChange={event => setPassword(event.target.value)} />
        </div>
        {error && <Alert variant="danger" className="auth-error">{error}</Alert>}
        <Button className="full-width" variant="primary" size="lg" type="submit" loading={loading}>
          {mode === 'register' ? 'Присоединиться' : 'Войти в аккаунт'} <PixelIcon name="arrow-right" />
        </Button>
      </form>
      <p className="dialog-note">Только email и пароль. Никаких писем с подтверждением.</p>
    </DialogContent>
  </Dialog>;
}

export default function App() {
  const battle = useBattle();
  const { board, connection, error, clockOffset, syncClock, acceptPixel } = battle;
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [selected, setSelected] = useState<Point | null>(null);
  const [color, setColor] = useState(14);
  const [placing, setPlacing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; danger?: boolean } | null>(null);
  const [now, setNow] = useState(Date.now());

  const refreshUser = useCallback(async () => {
    try {
      const result = await api<AuthResult>('/api/auth/me');
      setUser(result.user); syncClock(result.server_time);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) setUser(null);
    } finally { setAuthLoading(false); }
  }, [syncClock]);

  useEffect(() => {
    void refreshUser();
    const onFocus = () => { void refreshUser(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUser]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const remaining = Math.max(0, (user?.next_pixel_at ?? 0) - now - clockOffset);
  const cooldown = (board?.cooldown_seconds ?? 5) * 1000;
  const progress = 100 - Math.min(100, remaining / cooldown * 100);
  const painted = useMemo(() => board?.pixels.reduce((count, pixel) => count + Number(pixel !== 0), 0) ?? 0, [board]);
  const sameColor = !!(board && selected && board.pixels[selected.y * board.size + selected.x] === color);

  const place = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (!selected || !board || placing || remaining > 0) return;
    setPlacing(true);
    try {
      const result = await api<Placement>('/api/pixels', { ...selected, color });
      setUser(previous => previous ? { ...previous, next_pixel_at: result.next_pixel_at } : null);
      syncClock(result.server_time);
      if (result.changed) acceptPixel({ type: 'pixel.changed', ...result } as PixelEvent);
      setNotice({ text: result.changed ? 'Готово! Ваш пиксель на общем полотне.' : 'Этот пиксель уже такого цвета.' });
    } catch (failure) {
      if (failure instanceof ApiError) {
        if (failure.nextPixelAt) setUser(previous => previous ? { ...previous, next_pixel_at: failure.nextPixelAt! } : null);
        if (failure.serverTime) syncClock(failure.serverTime);
        if (failure.status === 401) { setUser(null); setAuthOpen(true); }
      }
      setNotice({ text: failure instanceof Error ? failure.message : 'Не удалось раскрасить пиксель', danger: true });
    } finally { setPlacing(false); }
  };

  const logout = async () => {
    try { await api('/api/auth/logout', {}); setUser(null); }
    catch { setNotice({ text: 'Не удалось выйти. Попробуйте еще раз.', danger: true }); }
  };

  return <TooltipProvider delayDuration={250}>
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Пиксель Баттл — главная">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>пиксель<span className="brand-second">баттл</span><span className="brand-dot">.</span></span>
        </a>
        <div className="header-right">
          {authLoading ? <Skeleton className="account-skeleton" /> : user ?
            <div className="account-controls"><span className="account-email" title={user.email}><PixelIcon name="cursor" />{user.email}</span>
              <Button size="sm" variant="ghost" onClick={() => void logout()}>Выйти</Button></div> :
            <Button variant="primary" onClick={() => setAuthOpen(true)}>Войти <PixelIcon name="arrow-right" /></Button>}
        </div>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <div><p className="eyebrow"><span className="tiny-pixel" /> СОЗДАЕМ ВМЕСТЕ, ПИКСЕЛЬ ЗА ПИКСЕЛЕМ</p>
            <h1 id="page-title">Один холст.<br className="mobile-break" /> <span>Тысячи идей.</span></h1></div>
          <div className="intro-stamp" aria-label="Один пиксель каждые 5 секунд"><PixelIcon name="pencil" size={32} />
            <span><strong>1 пиксель</strong><span>каждые 5 секунд</span></span>
          </div>
        </section>

        {notice && <div className="notice" role="status"><Alert variant={notice.danger ? 'danger' : 'success'}>{notice.text}</Alert></div>}

        <div className="workspace">
          <section className="board-panel" aria-labelledby="board-title">
            <div className="board-heading"><div className="board-heading-title"><PixelIcon name="grid" /><h2 id="board-title">Общее полотно</h2><Badge>256 × 256</Badge></div>
              <span className={`connection connection-${connection}`} role="status"><span />{connection === 'live' ? 'В эфире' : connection === 'connecting' ? 'Подключаемся' : 'Восстанавливаем связь'}</span>
            </div>
            {board ? <PixelCanvas board={board} selected={selected} color={color} onSelect={setSelected} /> :
              <div className="canvas-loading"><PixelIcon name="grid" size={48} /><p>{error || 'Разворачиваем полотно…'}</p><Skeleton /></div>}
            <div className="board-footer"><span><PixelIcon name="cursor" />{selected ? `Выбран пиксель: ${selected.x}, ${selected.y}` : 'Нажмите на поле, чтобы выбрать пиксель'}</span>
              <span className="desktop-hint">Колесико — зум · Перетаскивание — перемещение</span></div>
            {error && board && <Alert variant="warning">{error}</Alert>}
          </section>

          <aside className="sidebar" aria-label="Инструменты рисования">
            <Card className="palette-card"><div className="card-title"><h2>Ваш цвет</h2><Badge>32 цвета</Badge></div>
              <p className="card-description">Выберите настроение пикселя</p>
              <div className="palette" role="group" aria-label="Палитра цветов">
                {board ? board.palette.map((hex, index) => <Tooltip key={hex}>
                  <TooltipTrigger asChild><button className={`swatch ${color === index ? 'is-selected' : ''}`}
                    style={{ '--swatch': hex } as React.CSSProperties} aria-label={`Цвет ${hex}`}
                    aria-pressed={color === index} onClick={() => setColor(index)}>
                    {color === index && <PixelIcon name="check" style={{ color: [0, 1, 9, 10, 11, 17, 21, 25, 30, 31].includes(index) ? '#49332f' : '#fff' }} />}
                  </button></TooltipTrigger><TooltipContent>{hex}</TooltipContent>
                </Tooltip>) : Array.from({ length: 32 }, (_, index) => <Skeleton key={index} className="swatch" />)}
              </div>
              <div className="selected-color"><span style={{ backgroundColor: board?.palette[color] ?? '#EA5B3A' }} />
                <span>Выбранный цвет</span><strong>{board?.palette[color] ?? '#EA5B3A'}</strong></div>
            </Card>

            <Card className="action-card"><div className="card-title"><h2>Ваш следующий ход</h2><PixelIcon name="pencil" /></div>
              <div className="pixel-preview"><div className="pixel-preview-swatch" style={{ '--preview': board?.palette[color] ?? '#EA5B3A' } as React.CSSProperties} />
                <div><strong>{selected ? `X: ${selected.x} · Y: ${selected.y}` : 'Где будет ваш пиксель?'}</strong>
                  <span>{selected ? 'Одна точка. Ваша идея.' : 'Выберите точку на полотне'}</span></div></div>
              <div className="cooldown-label"><span>{!user ? 'Ваш первый пиксель ждет' : remaining > 0 ? 'Немного терпения…' : 'Можно рисовать!'}</span>
                <strong>{remaining > 0 ? `${Math.ceil(remaining / 1000)} сек` : <PixelIcon name="check" />}</strong></div>
              <Progress value={user ? progress : 100} aria-label="Готовность следующего пикселя" />
              <Button className="paint-button" size="lg" variant="primary" loading={placing}
                disabled={authLoading || (!!user && (!selected || !board || connection !== 'live' || remaining > 0 || sameColor))}
                onClick={() => void place()}>
                <PixelIcon name="pencil" />{!user ? 'Войти и рисовать' : remaining > 0 ? `Следующий через ${Math.ceil(remaining / 1000)} сек` : 'Раскрасить пиксель'}
              </Button>
              {(!user || sameColor) && <p className="action-note">{sameColor && user ? 'Пиксель уже такого цвета. Выберите другой.' : 'Наблюдайте свободно. Рисуйте с аккаунтом.'}</p>}
            </Card>

            <div className="little-note"><PixelFlower /><div><strong>Здесь растут идеи</strong><p>Рисуйте рядом.<br />Продолжайте чужие истории.<br />Придумывайте свои.</p></div></div>
          </aside>
        </div>

        <div className="bottom-row">
          <div className="board-stats"><span className="stat-icon"><PixelIcon name="layers" size={32} /></span><div>
            <strong>{painted.toLocaleString('ru-RU')} <span>/ 65 536</span></strong><p>пикселей обрели цвет</p></div></div>
        </div>
      </main>
      <footer className="site-footer"><span>Место для каждого пикселя.</span><span>Сделано для совместного творчества <PixelIcon name="heart" /></span></footer>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} onAuth={result => {
        setUser(result.user); syncClock(result.server_time); setNotice({ text: 'Вы в игре. Выберите свой первый пиксель!' });
      }} />
    </div>
  </TooltipProvider>;
}
