'use client';

import * as React from 'react';
import {
  Accordion as A, AlertDialog as AD, Avatar as AV, Checkbox as C,
  Dialog as D, DropdownMenu as M, HoverCard as H, Popover as P,
  Progress as PR, RadioGroup as R, ScrollArea as SA, Select as S,
  Separator as SE, Slider as SL, Slot, Switch as SW, Tabs as T,
  Toast as TO, Toggle as TG, ToggleGroup as TGG, Tooltip as TT,
  Collapsible as CO, ContextMenu as CM
} from 'radix-ui';
import './styles.css';

export const cn = (...values: (string | false | undefined | null)[]) => values.filter(Boolean).join(' ');
const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges"><path d="M2 7h2v2h2v2h2V9h2V7h2V5h2V3h-2v2h-2v2H8v2H6V7H4V5H2z"/></svg>;
const ChevronIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges"><path d="M2 5h2v2h2v2h4V7h2V5h2v4h-2v2h-2v2H6v-2H4V9H2z"/></svg>;
const CloseIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges"><path d="M2 2h2v2h2v2h4V4h2V2h2v2h-2v2h-2v4h2v2h2v2h-2v-2h-2v-2H6v2H4v2H2v-2h2v-2h2V6H4V4H2z"/></svg>;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg' | 'icon'; asChild?: boolean; loading?: boolean;
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({className, variant='secondary', size='md', asChild, loading, children, disabled, ...props},ref) => {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp ref={ref} type={asChild ? undefined : 'button'} className={cn('pk-button',`pk-button--${variant}`,`pk-button--${size}`,className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{loading ? <><span className="pk-spinner" aria-hidden/>{children}</> : children}</Comp>;
});
Button.displayName='Button';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({className,...props},ref)=><input ref={ref} className={cn('pk-input',className)} {...props}/>);
Input.displayName='Input';
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({className,...props},ref)=><textarea ref={ref} className={cn('pk-input','pk-textarea',className)} {...props}/>);
Textarea.displayName='Textarea';
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({className,...props},ref)=><label ref={ref} className={cn('pk-label',className)} {...props}/>);
Label.displayName='Label';
export function Badge({className,variant='neutral',...props}:React.HTMLAttributes<HTMLSpanElement>&{variant?:'neutral'|'accent'|'success'|'warning'|'danger'}){return <span className={cn('pk-badge',`pk-badge--${variant}`,className)} {...props}/>}
export const Card=React.forwardRef<HTMLDivElement,React.HTMLAttributes<HTMLDivElement>>(({className,...props},ref)=><div ref={ref} className={cn('pk-card',className)} {...props}/>);
Card.displayName='Card';
export type MotionProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Optional fade entrance for additional content. */
  preset?: 'fade' | 'none';
  /** Delay in milliseconds; useful for staggered groups. */
  delay?: number;
  /** Override the entrance duration in milliseconds. */
  duration?: number;
  asChild?: boolean;
};
/** Optional entrance animation. Replays on mount; no runtime animation dependency. */
export const Motion=React.forwardRef<HTMLDivElement,MotionProps>(({preset='fade',delay=0,duration,asChild,className,style,...props},ref)=>{
  const Comp=asChild ? Slot.Root : 'div';
  const motionStyle={
    '--pk-motion-delay':`${Math.max(0,delay)}ms`,
    ...(duration===undefined ? {} : {'--pk-motion-duration':`${Math.max(0,duration)}ms`}),
    ...style
  } as React.CSSProperties;
  return <Comp ref={ref} className={cn('pk-motion',className)} data-pixel-enter={preset==='none'?'none':'fade'} style={motionStyle} {...props}/>;
});
Motion.displayName='Motion';
export function Skeleton({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div aria-hidden className={cn('pk-skeleton',className)} {...props}/>}
export function Alert({className,variant='info',...props}:React.HTMLAttributes<HTMLDivElement>&{variant?:'info'|'success'|'warning'|'danger'}){return <div role="status" className={cn('pk-alert',`pk-alert--${variant}`,className)} {...props}/>}
export const Separator=React.forwardRef<React.ElementRef<typeof SE.Root>,React.ComponentPropsWithoutRef<typeof SE.Root>>(({className,...props},ref)=><SE.Root ref={ref} className={cn('pk-separator',className)} {...props}/>);
Separator.displayName='Separator';

export const Checkbox=React.forwardRef<React.ElementRef<typeof C.Root>,React.ComponentPropsWithoutRef<typeof C.Root>>(({className,...props},ref)=><C.Root ref={ref} className={cn('pk-checkbox',className)} {...props}><C.Indicator className="pk-check-indicator"><CheckIcon/></C.Indicator></C.Root>);
Checkbox.displayName='Checkbox';
export const Switch=React.forwardRef<React.ElementRef<typeof SW.Root>,React.ComponentPropsWithoutRef<typeof SW.Root>>(({className,...props},ref)=><SW.Root ref={ref} className={cn('pk-switch',className)} {...props}><SW.Thumb className="pk-switch-thumb"/></SW.Root>);
Switch.displayName='Switch';
export const Slider=React.forwardRef<React.ElementRef<typeof SL.Root>,React.ComponentPropsWithoutRef<typeof SL.Root>>(({className,'aria-label':ariaLabel,'aria-labelledby':ariaLabelledBy,...props},ref)=>{
  const count=(props.value??props.defaultValue??[0]).length;
  return <SL.Root ref={ref} className={cn('pk-slider',className)} {...props}><SL.Track className="pk-slider-track"><SL.Range className="pk-slider-range"/></SL.Track>{Array.from({length:count},(_,i)=><SL.Thumb key={i} className="pk-slider-thumb" aria-label={ariaLabel ? (count>1 ? `${ariaLabel} ${i+1}` : ariaLabel) : undefined} aria-labelledby={ariaLabelledBy}/>)}</SL.Root>;
});
Slider.displayName='Slider';
export const RadioGroup=R.Root;
export const RadioItem=React.forwardRef<React.ElementRef<typeof R.Item>,React.ComponentPropsWithoutRef<typeof R.Item>>(({className,...props},ref)=><R.Item ref={ref} className={cn('pk-radio',className)} {...props}><R.Indicator className="pk-radio-indicator"/></R.Item>);
RadioItem.displayName='RadioItem';
export const Toggle=React.forwardRef<React.ElementRef<typeof TG.Root>,React.ComponentPropsWithoutRef<typeof TG.Root>>(({className,...props},ref)=><TG.Root ref={ref} className={cn('pk-toggle',className)} {...props}/>);
Toggle.displayName='Toggle';
export const ToggleGroup=TGG.Root;
export const ToggleGroupItem=React.forwardRef<React.ElementRef<typeof TGG.Item>,React.ComponentPropsWithoutRef<typeof TGG.Item>>(({className,...props},ref)=><TGG.Item ref={ref} className={cn('pk-toggle',className)} {...props}/>);
ToggleGroupItem.displayName='ToggleGroupItem';

export const Select=S.Root;
export const SelectValue=S.Value;
export const SelectTrigger=React.forwardRef<React.ElementRef<typeof S.Trigger>,React.ComponentPropsWithoutRef<typeof S.Trigger>>(({className,children,...props},ref)=><S.Trigger ref={ref} className={cn('pk-select-trigger',className)} {...props}>{children}<S.Icon><ChevronIcon/></S.Icon></S.Trigger>);
SelectTrigger.displayName='SelectTrigger';
export const SelectContent=React.forwardRef<React.ElementRef<typeof S.Content>,React.ComponentPropsWithoutRef<typeof S.Content>>(({className,children,position='popper',sideOffset=6,...props},ref)=><S.Portal><S.Content ref={ref} className={cn('pk-floating','pk-select-content',className)} position={position} sideOffset={sideOffset} {...props}><S.ScrollUpButton className="pk-select-scroll">↑</S.ScrollUpButton><S.Viewport>{children}</S.Viewport><S.ScrollDownButton className="pk-select-scroll">↓</S.ScrollDownButton></S.Content></S.Portal>);
SelectContent.displayName='SelectContent';
export const SelectItem=React.forwardRef<React.ElementRef<typeof S.Item>,React.ComponentPropsWithoutRef<typeof S.Item>>(({className,children,...props},ref)=><S.Item ref={ref} className={cn('pk-menu-item',className)} {...props}><S.ItemText>{children}</S.ItemText><S.ItemIndicator className="pk-item-indicator"><CheckIcon/></S.ItemIndicator></S.Item>);
SelectItem.displayName='SelectItem';

export const Tabs=T.Root;
export const TabsList=React.forwardRef<React.ElementRef<typeof T.List>,React.ComponentPropsWithoutRef<typeof T.List>>(({className,...props},ref)=><T.List ref={ref} className={cn('pk-tabs-list',className)} {...props}/>);
TabsList.displayName='TabsList';
export const TabsTrigger=React.forwardRef<React.ElementRef<typeof T.Trigger>,React.ComponentPropsWithoutRef<typeof T.Trigger>>(({className,...props},ref)=><T.Trigger ref={ref} className={cn('pk-tabs-trigger',className)} {...props}/>);
TabsTrigger.displayName='TabsTrigger';
export const TabsContent=React.forwardRef<React.ElementRef<typeof T.Content>,React.ComponentPropsWithoutRef<typeof T.Content>>(({className,...props},ref)=><T.Content ref={ref} className={cn('pk-tabs-content',className)} {...props}/>);
TabsContent.displayName='TabsContent';

export const Dialog=D.Root;
export const DialogTrigger=D.Trigger;
export const DialogClose=D.Close;
export const DialogTitle=React.forwardRef<React.ElementRef<typeof D.Title>,React.ComponentPropsWithoutRef<typeof D.Title>>(({className,...props},ref)=><D.Title ref={ref} className={cn('pk-dialog-title',className)} {...props}/>);
DialogTitle.displayName='DialogTitle';
export const DialogDescription=React.forwardRef<React.ElementRef<typeof D.Description>,React.ComponentPropsWithoutRef<typeof D.Description>>(({className,...props},ref)=><D.Description ref={ref} className={cn('pk-description',className)} {...props}/>);
DialogDescription.displayName='DialogDescription';
export const DialogContent=React.forwardRef<React.ElementRef<typeof D.Content>,React.ComponentPropsWithoutRef<typeof D.Content>>(({className,children,...props},ref)=><D.Portal><D.Overlay className="pk-overlay"/><D.Content ref={ref} className={cn('pk-floating','pk-dialog',className)} {...props}>{children}<D.Close className="pk-close" aria-label="Закрыть"><CloseIcon/></D.Close></D.Content></D.Portal>);
DialogContent.displayName='DialogContent';

export const AlertDialog=AD.Root;
export const AlertDialogTrigger=AD.Trigger;
export const AlertDialogTitle=React.forwardRef<React.ElementRef<typeof AD.Title>,React.ComponentPropsWithoutRef<typeof AD.Title>>(({className,...props},ref)=><AD.Title ref={ref} className={cn('pk-dialog-title',className)} {...props}/>);
AlertDialogTitle.displayName='AlertDialogTitle';
export const AlertDialogDescription=React.forwardRef<React.ElementRef<typeof AD.Description>,React.ComponentPropsWithoutRef<typeof AD.Description>>(({className,...props},ref)=><AD.Description ref={ref} className={cn('pk-description',className)} {...props}/>);
AlertDialogDescription.displayName='AlertDialogDescription';
export const AlertDialogAction=AD.Action;
export const AlertDialogCancel=AD.Cancel;
export const AlertDialogContent=React.forwardRef<React.ElementRef<typeof AD.Content>,React.ComponentPropsWithoutRef<typeof AD.Content>>(({className,...props},ref)=><AD.Portal><AD.Overlay className="pk-overlay"/><AD.Content ref={ref} className={cn('pk-floating','pk-dialog',className)} {...props}/></AD.Portal>);
AlertDialogContent.displayName='AlertDialogContent';

export const Popover=P.Root;
export const PopoverTrigger=P.Trigger;
export const PopoverClose=P.Close;
export const PopoverContent=React.forwardRef<React.ElementRef<typeof P.Content>,React.ComponentPropsWithoutRef<typeof P.Content>>(({className,sideOffset=10,...props},ref)=><P.Portal><P.Content ref={ref} className={cn('pk-floating','pk-popover',className)} sideOffset={sideOffset} {...props}/></P.Portal>);
PopoverContent.displayName='PopoverContent';
export const HoverCard=H.Root;
export const HoverCardTrigger=H.Trigger;
export const HoverCardContent=React.forwardRef<React.ElementRef<typeof H.Content>,React.ComponentPropsWithoutRef<typeof H.Content>>(({className,sideOffset=10,...props},ref)=><H.Portal><H.Content ref={ref} className={cn('pk-floating','pk-popover',className)} sideOffset={sideOffset} {...props}/></H.Portal>);
HoverCardContent.displayName='HoverCardContent';
export const TooltipProvider=TT.Provider;
export const Tooltip=TT.Root;
export const TooltipTrigger=TT.Trigger;
export const TooltipContent=React.forwardRef<React.ElementRef<typeof TT.Content>,React.ComponentPropsWithoutRef<typeof TT.Content>>(({className,sideOffset=8,...props},ref)=><TT.Portal><TT.Content ref={ref} className={cn('pk-floating','pk-tooltip',className)} sideOffset={sideOffset} {...props}/></TT.Portal>);
TooltipContent.displayName='TooltipContent';

export const DropdownMenu=M.Root;
export const DropdownMenuTrigger=M.Trigger;
export const DropdownMenuContent=React.forwardRef<React.ElementRef<typeof M.Content>,React.ComponentPropsWithoutRef<typeof M.Content>>(({className,sideOffset=8,...props},ref)=><M.Portal><M.Content ref={ref} className={cn('pk-floating','pk-menu',className)} sideOffset={sideOffset} {...props}/></M.Portal>);
DropdownMenuContent.displayName='DropdownMenuContent';
export const DropdownMenuItem=React.forwardRef<React.ElementRef<typeof M.Item>,React.ComponentPropsWithoutRef<typeof M.Item>&{danger?:boolean}>(({className,danger,...props},ref)=><M.Item ref={ref} className={cn('pk-menu-item',danger&&'pk-menu-item--danger',className)} {...props}/>);
DropdownMenuItem.displayName='DropdownMenuItem';
export const DropdownMenuSeparator=React.forwardRef<React.ElementRef<typeof M.Separator>,React.ComponentPropsWithoutRef<typeof M.Separator>>(({className,...props},ref)=><M.Separator ref={ref} className={cn('pk-separator',className)} {...props}/>);
DropdownMenuSeparator.displayName='DropdownMenuSeparator';
export const DropdownMenuLabel=React.forwardRef<React.ElementRef<typeof M.Label>,React.ComponentPropsWithoutRef<typeof M.Label>>(({className,...props},ref)=><M.Label ref={ref} className={cn('pk-menu-label',className)} {...props}/>);
DropdownMenuLabel.displayName='DropdownMenuLabel';
export const ContextMenu=CM.Root;
export const ContextMenuTrigger=CM.Trigger;
export const ContextMenuContent=React.forwardRef<React.ElementRef<typeof CM.Content>,React.ComponentPropsWithoutRef<typeof CM.Content>>(({className,...props},ref)=><CM.Portal><CM.Content ref={ref} className={cn('pk-floating','pk-menu',className)} {...props}/></CM.Portal>);
ContextMenuContent.displayName='ContextMenuContent';
export const ContextMenuItem=React.forwardRef<React.ElementRef<typeof CM.Item>,React.ComponentPropsWithoutRef<typeof CM.Item>>(({className,...props},ref)=><CM.Item ref={ref} className={cn('pk-menu-item',className)} {...props}/>);
ContextMenuItem.displayName='ContextMenuItem';

export const Accordion=A.Root;
export const AccordionItem=React.forwardRef<React.ElementRef<typeof A.Item>,React.ComponentPropsWithoutRef<typeof A.Item>>(({className,...props},ref)=><A.Item ref={ref} className={cn('pk-accordion-item',className)} {...props}/>);
AccordionItem.displayName='AccordionItem';
export const AccordionTrigger=React.forwardRef<React.ElementRef<typeof A.Trigger>,React.ComponentPropsWithoutRef<typeof A.Trigger>>(({className,children,...props},ref)=><A.Header className="pk-accordion-header"><A.Trigger ref={ref} className={cn('pk-accordion-trigger',className)} {...props}>{children}<ChevronIcon/></A.Trigger></A.Header>);
AccordionTrigger.displayName='AccordionTrigger';
export const AccordionContent=React.forwardRef<React.ElementRef<typeof A.Content>,React.ComponentPropsWithoutRef<typeof A.Content>>(({className,children,...props},ref)=><A.Content ref={ref} className={cn('pk-accordion-content',className)} {...props}><div>{children}</div></A.Content>);
AccordionContent.displayName='AccordionContent';
export const Collapsible=CO.Root;
export const CollapsibleTrigger=React.forwardRef<React.ElementRef<typeof CO.Trigger>,React.ComponentPropsWithoutRef<typeof CO.Trigger>>(({className,...props},ref)=><CO.Trigger ref={ref} className={cn('pk-collapsible-trigger',className)} {...props}/>);
CollapsibleTrigger.displayName='CollapsibleTrigger';
export const CollapsibleContent=React.forwardRef<React.ElementRef<typeof CO.Content>,React.ComponentPropsWithoutRef<typeof CO.Content>>(({className,...props},ref)=><CO.Content ref={ref} className={cn('pk-collapsible-content',className)} {...props}/>);
CollapsibleContent.displayName='CollapsibleContent';

export const Avatar=React.forwardRef<React.ElementRef<typeof AV.Root>,React.ComponentPropsWithoutRef<typeof AV.Root>&{src?:string;alt?:string;fallback?:string}>(({className,src,alt='',fallback='UI',children,...props},ref)=><AV.Root ref={ref} className={cn('pk-avatar',className)} {...props}><AV.Image src={src} alt={alt}/><AV.Fallback>{fallback}</AV.Fallback>{children}</AV.Root>);
Avatar.displayName='Avatar';
export const Progress=React.forwardRef<React.ElementRef<typeof PR.Root>,React.ComponentPropsWithoutRef<typeof PR.Root>>(({className,value=0,...props},ref)=><PR.Root ref={ref} value={value} className={cn('pk-progress',className)} {...props}><PR.Indicator className={cn('pk-progress-indicator',value===null&&'pk-progress-indeterminate')} style={value===null?undefined:{transform:`translateX(-${100-Math.max(0,Math.min(100,value))}%)`}}/></PR.Root>);
Progress.displayName='Progress';
export const ScrollArea=React.forwardRef<React.ElementRef<typeof SA.Root>,React.ComponentPropsWithoutRef<typeof SA.Root>>(({className,children,...props},ref)=><SA.Root ref={ref} className={cn('pk-scroll-area',className)} {...props}><SA.Viewport className="pk-scroll-viewport">{children}</SA.Viewport><SA.Scrollbar orientation="vertical" className="pk-scrollbar"><SA.Thumb className="pk-scroll-thumb"/></SA.Scrollbar><SA.Corner/></SA.Root>);
ScrollArea.displayName='ScrollArea';

export const ToastProvider=TO.Provider;
export const ToastTitle=TO.Title;
export const ToastDescription=TO.Description;
export const ToastAction=TO.Action;
export const ToastClose=TO.Close;
export const Toast=React.forwardRef<React.ElementRef<typeof TO.Root>,React.ComponentPropsWithoutRef<typeof TO.Root>>(({className,...props},ref)=><TO.Root ref={ref} className={cn('pk-floating','pk-toast',className)} {...props}/>);
Toast.displayName='Toast';
export const ToastViewport=React.forwardRef<React.ElementRef<typeof TO.Viewport>,React.ComponentPropsWithoutRef<typeof TO.Viewport>>(({className,...props},ref)=><TO.Viewport ref={ref} className={cn('pk-toast-viewport',className)} {...props}/>);
ToastViewport.displayName='ToastViewport';
export { PixelIcon, type PixelIconName, type PixelIconProps } from './icons';
