# Pixelkit

Самостоятельная библиотека пиксельных React-компонентов на Radix Primitives. Версия 0.1.0. 30 семейств компонентов, утилита Motion и набор оригинальных пиксельных SVG-иконок.

## Установка

В этом проекте пакет хранится распакованным в `vendor/pixel-kit-react/` и не требует архива или публикации в npm-реестре. Из каталога `frontend/` зависимости устанавливаются командой:

```sh
npm ci
```

Требуются React и React DOM 18 или 19. Зависимость radix-ui устанавливается автоматически. Tailwind, Veil UI и отдельная библиотека анимаций не нужны.

```tsx
import { Button, Card, PixelIcon } from '@pixel-kit/react';
import '@pixel-kit/react/styles.css';

export default function Example() {
  return <Card>
    <h2>Новый проект</h2>
    <Button variant="primary" onClick={() => console.log('Create')}>
      <PixelIcon name="plus" /> Создать
    </Button>
  </Card>;
}
```

Встроенный шрифт Pixelify Sans поддерживает кириллицу и латиницу. Собранный CSS содержит шрифт как data URL: дополнительных запросов к сервисам шрифтов нет. Открытая лицензия шрифта находится в src/fonts/OFL.txt. Иконки написаны для Pixelkit на сетке 16×16; для чёткой геометрии предпочтительны размеры 16, 32, 48 и т.д.

## Компоненты

- Действия: Button, Toggle, ToggleGroup / ToggleGroupItem.
- Ввод: Input, Textarea, Label, Select / SelectTrigger / SelectValue / SelectContent / SelectItem, Checkbox, Switch, Slider, RadioGroup / RadioItem.
- Навигация: Tabs / TabsList / TabsTrigger / TabsContent; Accordion / AccordionItem / AccordionTrigger / AccordionContent; Collapsible / CollapsibleTrigger / CollapsibleContent.
- Оверлеи: Dialog / DialogTrigger / DialogContent / DialogTitle / DialogDescription / DialogClose; AlertDialog / AlertDialogTrigger / AlertDialogContent / AlertDialogTitle / AlertDialogDescription / AlertDialogAction / AlertDialogCancel; DropdownMenu / DropdownMenuTrigger / DropdownMenuContent / DropdownMenuItem / DropdownMenuSeparator / DropdownMenuLabel; ContextMenu / ContextMenuTrigger / ContextMenuContent / ContextMenuItem; Popover / PopoverTrigger / PopoverContent / PopoverClose; HoverCard / HoverCardTrigger / HoverCardContent; TooltipProvider / Tooltip / TooltipTrigger / TooltipContent.
- Отображение: Avatar, Badge, Card, Separator, ScrollArea.
- Обратная связь: Progress, Skeleton, Alert; ToastProvider / Toast / ToastTitle / ToastDescription / ToastAction / ToastClose / ToastViewport.
- Утилиты: Motion, PixelIcon, cn.

Обёртки сохраняют свойства и ref соответствующих Radix-примитивов. Доступны контролируемые value/checked/open с обработчиками либо defaultValue/defaultChecked/defaultOpen. Tooltip требует TooltipProvider. Toast требует ToastProvider и ToastViewport. DialogContent требует DialogTitle и DialogDescription; при отсутствии описания явно задайте aria-describedby={undefined}.

## Варианты и свойства

Button: variant="primary | secondary | ghost | danger", size="sm | md | lg | icon", loading, asChild. Для asChild передавайте один React-элемент; не совмещайте его с loading. disabled предназначен для button; недоступность ссылок обрабатывайте отдельно.

Badge: variant="neutral | accent | success | warning | danger". Alert: variant="info | success | warning | danger".

Avatar: src, alt, fallback. Изображение отображается с image-rendering:pixelated. Progress: value={0..100}, value={null} для неопределённого прогресса. Slider поддерживает диапазон через массив значений.

PixelIcon: name, size (по умолчанию 16), label. Без label иконка декоративная и скрыта от ассистивных технологий. С label получает role="img" и доступное имя. Тип PixelIconName содержит все допустимые имена.

Motion: preset="fade | none", delay, duration в миллисекундах, asChild. Анимирует только появление при монтировании. По умолчанию — короткий fade 100 мс, без задержки. Статические компоненты не анимируются сами. Не накладывайте Motion на уже анимированные Content-части Radix.

## Оформление

Все классы имеют префикс pk-, переменные — --pk-. Стили не оформляют произвольные button/input вашего приложения. Пиксельная рамка Button, Card и всплывающих панелей использует один ступенчатый контур с псевдоэлементом для плоской заливки. Для этих компонентов задавайте цвет заливки через --pk-fill, а не background: корневой фон рисует рамку. clip-path обрезает содержимое по силуэту, поэтому не размещайте выходящие за границы элементы в таких поверхностях; всплывающие компоненты Radix используют Portal.

```css
:root {
  --pk-ink: #49332f;
  --pk-paper: #ffecd7;
  --pk-surface: #fff7e9;
  --pk-bg: #edf1fb;
  --pk-accent: #68b5ac;
  --pk-accent-soft: #d6e9d8;
  --pk-yellow: #efc85c;
  --pk-coral: #ee7f73;
  --pk-blue: #a6b9e4;
  --pk-stroke: 2px;
}
```

Переменные и тему задавайте на html, чтобы их наследовали порталы:

```js
document.documentElement.dataset.pixelTheme = 'dark'; // 'light' по умолчанию
```

Подключайте свои override-стили после styles.css. Не изменяйте clip-path и z-index псевдоэлемента без учёта устройства рамки. Для тёмной темы и собственных палитр проверяйте контраст своих цветов и изображений.

## Доступность и движение

Сложные взаимодействия обеспечивает Radix. Передавайте Label/aria-label полям, осмысленные заголовки диалогам и alt изображениям. Сайт-превью демонстрирует клавиатуру, возврат фокуса, закрытие по Escape и контролируемые состояния. Это не полный аудит WCAG для вашего проекта.

Появление панелей — 80 мс; закрытие — 60 мс. Раскрытие по высоте — 100–120 мс. CSS-анимации выхода удерживаются Radix до завершения. При удалении всего родителя из React-дерева выход дочерних панелей проиграться не может.

prefers-reduced-motion:reduce отключает анимации. Можно также задать data-pixel-motion="off" на html или контейнере. Локальное отключение не распространяется на порталы в body.

Для Next.js App Router подключайте CSS в корневом layout, интерактивные примеры размещайте в клиентских компонентах. Собранный JS сохраняет директиву use client. В каталоге библиотеки есть исходники, ES modules, CSS, типы TypeScript и лицензии.
