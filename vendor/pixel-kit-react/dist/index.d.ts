import * as React from 'react';
import { Accordion as A, AlertDialog as AD, Avatar as AV, Checkbox as C, Dialog as D, DropdownMenu as M, HoverCard as H, Popover as P, Progress as PR, RadioGroup as R, ScrollArea as SA, Select as S, Separator as SE, Slider as SL, Switch as SW, Tabs as T, Toast as TO, Toggle as TG, ToggleGroup as TGG, Tooltip as TT, Collapsible as CO, ContextMenu as CM } from 'radix-ui';
import './styles.css';
export declare const cn: (...values: (string | false | undefined | null)[]) => string;
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    asChild?: boolean;
    loading?: boolean;
};
export declare const Button: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
    asChild?: boolean;
    loading?: boolean;
} & React.RefAttributes<HTMLButtonElement>>;
export declare const Input: React.ForwardRefExoticComponent<React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>>;
export declare const Textarea: React.ForwardRefExoticComponent<React.TextareaHTMLAttributes<HTMLTextAreaElement> & React.RefAttributes<HTMLTextAreaElement>>;
export declare const Label: React.ForwardRefExoticComponent<React.LabelHTMLAttributes<HTMLLabelElement> & React.RefAttributes<HTMLLabelElement>>;
export declare function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & {
    variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}): React.JSX.Element;
export declare const Card: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
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
export declare const Motion: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {
    /** Optional fade entrance for additional content. */
    preset?: "fade" | "none";
    /** Delay in milliseconds; useful for staggered groups. */
    delay?: number;
    /** Override the entrance duration in milliseconds. */
    duration?: number;
    asChild?: boolean;
} & React.RefAttributes<HTMLDivElement>>;
export declare function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;
export declare function Alert({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'info' | 'success' | 'warning' | 'danger';
}): React.JSX.Element;
export declare const Separator: React.ForwardRefExoticComponent<Omit<SE.SeparatorProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const Checkbox: React.ForwardRefExoticComponent<Omit<C.CheckboxProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export declare const Switch: React.ForwardRefExoticComponent<Omit<SW.SwitchProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export declare const Slider: React.ForwardRefExoticComponent<Omit<SL.SliderProps & React.RefAttributes<HTMLSpanElement>, "ref"> & React.RefAttributes<HTMLSpanElement>>;
export declare const RadioGroup: React.ForwardRefExoticComponent<R.RadioGroupProps & React.RefAttributes<HTMLDivElement>>;
export declare const RadioItem: React.ForwardRefExoticComponent<Omit<R.RadioGroupItemProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export declare const Toggle: React.ForwardRefExoticComponent<Omit<TG.ToggleProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export declare const ToggleGroup: React.ForwardRefExoticComponent<(TGG.ToggleGroupSingleProps | TGG.ToggleGroupMultipleProps) & React.RefAttributes<HTMLDivElement>>;
export declare const ToggleGroupItem: React.ForwardRefExoticComponent<Omit<TGG.ToggleGroupItemProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export declare const Select: React.FC<S.SelectProps>;
export declare const SelectValue: React.ForwardRefExoticComponent<S.SelectValueProps & React.RefAttributes<HTMLSpanElement>>;
export declare const SelectTrigger: React.ForwardRefExoticComponent<Omit<S.SelectTriggerProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export declare const SelectContent: React.ForwardRefExoticComponent<Omit<S.SelectContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const SelectItem: React.ForwardRefExoticComponent<Omit<S.SelectItemProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const Tabs: React.ForwardRefExoticComponent<T.TabsProps & React.RefAttributes<HTMLDivElement>>;
export declare const TabsList: React.ForwardRefExoticComponent<Omit<T.TabsListProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const TabsTrigger: React.ForwardRefExoticComponent<Omit<T.TabsTriggerProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export declare const TabsContent: React.ForwardRefExoticComponent<Omit<T.TabsContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const Dialog: React.FC<D.DialogProps>;
export declare const DialogTrigger: React.ForwardRefExoticComponent<D.DialogTriggerProps & React.RefAttributes<HTMLButtonElement>>;
export declare const DialogClose: React.ForwardRefExoticComponent<D.DialogCloseProps & React.RefAttributes<HTMLButtonElement>>;
export declare const DialogTitle: React.ForwardRefExoticComponent<Omit<D.DialogTitleProps & React.RefAttributes<HTMLHeadingElement>, "ref"> & React.RefAttributes<HTMLHeadingElement>>;
export declare const DialogDescription: React.ForwardRefExoticComponent<Omit<D.DialogDescriptionProps & React.RefAttributes<HTMLParagraphElement>, "ref"> & React.RefAttributes<HTMLParagraphElement>>;
export declare const DialogContent: React.ForwardRefExoticComponent<Omit<D.DialogContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const AlertDialog: React.FC<AD.AlertDialogProps>;
export declare const AlertDialogTrigger: React.ForwardRefExoticComponent<AD.AlertDialogTriggerProps & React.RefAttributes<HTMLButtonElement>>;
export declare const AlertDialogTitle: React.ForwardRefExoticComponent<Omit<AD.AlertDialogTitleProps & React.RefAttributes<HTMLHeadingElement>, "ref"> & React.RefAttributes<HTMLHeadingElement>>;
export declare const AlertDialogDescription: React.ForwardRefExoticComponent<Omit<AD.AlertDialogDescriptionProps & React.RefAttributes<HTMLParagraphElement>, "ref"> & React.RefAttributes<HTMLParagraphElement>>;
export declare const AlertDialogAction: React.ForwardRefExoticComponent<AD.AlertDialogActionProps & React.RefAttributes<HTMLButtonElement>>;
export declare const AlertDialogCancel: React.ForwardRefExoticComponent<AD.AlertDialogCancelProps & React.RefAttributes<HTMLButtonElement>>;
export declare const AlertDialogContent: React.ForwardRefExoticComponent<Omit<AD.AlertDialogContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const Popover: React.FC<P.PopoverProps>;
export declare const PopoverTrigger: React.ForwardRefExoticComponent<P.PopoverTriggerProps & React.RefAttributes<HTMLButtonElement>>;
export declare const PopoverClose: React.ForwardRefExoticComponent<P.PopoverCloseProps & React.RefAttributes<HTMLButtonElement>>;
export declare const PopoverContent: React.ForwardRefExoticComponent<Omit<P.PopoverContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const HoverCard: React.FC<H.HoverCardProps>;
export declare const HoverCardTrigger: React.ForwardRefExoticComponent<H.HoverCardTriggerProps & React.RefAttributes<HTMLAnchorElement>>;
export declare const HoverCardContent: React.ForwardRefExoticComponent<Omit<H.HoverCardContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const TooltipProvider: React.FC<TT.TooltipProviderProps>;
export declare const Tooltip: React.FC<TT.TooltipProps>;
export declare const TooltipTrigger: React.ForwardRefExoticComponent<TT.TooltipTriggerProps & React.RefAttributes<HTMLButtonElement>>;
export declare const TooltipContent: React.ForwardRefExoticComponent<Omit<TT.TooltipContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const DropdownMenu: React.FC<M.DropdownMenuProps>;
export declare const DropdownMenuTrigger: React.ForwardRefExoticComponent<M.DropdownMenuTriggerProps & React.RefAttributes<HTMLButtonElement>>;
export declare const DropdownMenuContent: React.ForwardRefExoticComponent<Omit<M.DropdownMenuContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const DropdownMenuItem: React.ForwardRefExoticComponent<Omit<M.DropdownMenuItemProps & React.RefAttributes<HTMLDivElement>, "ref"> & {
    danger?: boolean;
} & React.RefAttributes<HTMLDivElement>>;
export declare const DropdownMenuSeparator: React.ForwardRefExoticComponent<Omit<M.DropdownMenuSeparatorProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const DropdownMenuLabel: React.ForwardRefExoticComponent<Omit<M.DropdownMenuLabelProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const ContextMenu: React.FC<CM.ContextMenuProps>;
export declare const ContextMenuTrigger: React.ForwardRefExoticComponent<CM.ContextMenuTriggerProps & React.RefAttributes<HTMLSpanElement>>;
export declare const ContextMenuContent: React.ForwardRefExoticComponent<Omit<CM.ContextMenuContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const ContextMenuItem: React.ForwardRefExoticComponent<Omit<CM.ContextMenuItemProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const Accordion: React.ForwardRefExoticComponent<(A.AccordionSingleProps | A.AccordionMultipleProps) & React.RefAttributes<HTMLDivElement>>;
export declare const AccordionItem: React.ForwardRefExoticComponent<Omit<A.AccordionItemProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const AccordionTrigger: React.ForwardRefExoticComponent<Omit<A.AccordionTriggerProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export declare const AccordionContent: React.ForwardRefExoticComponent<Omit<A.AccordionContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const Collapsible: React.ForwardRefExoticComponent<CO.CollapsibleProps & React.RefAttributes<HTMLDivElement>>;
export declare const CollapsibleTrigger: React.ForwardRefExoticComponent<Omit<CO.CollapsibleTriggerProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export declare const CollapsibleContent: React.ForwardRefExoticComponent<Omit<CO.CollapsibleContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const Avatar: React.ForwardRefExoticComponent<Omit<AV.AvatarProps & React.RefAttributes<HTMLSpanElement>, "ref"> & {
    src?: string;
    alt?: string;
    fallback?: string;
} & React.RefAttributes<HTMLSpanElement>>;
export declare const Progress: React.ForwardRefExoticComponent<Omit<PR.ProgressProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const ScrollArea: React.ForwardRefExoticComponent<Omit<SA.ScrollAreaProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export declare const ToastProvider: React.FC<TO.ToastProviderProps>;
export declare const ToastTitle: React.ForwardRefExoticComponent<TO.ToastTitleProps & React.RefAttributes<HTMLDivElement>>;
export declare const ToastDescription: React.ForwardRefExoticComponent<TO.ToastDescriptionProps & React.RefAttributes<HTMLDivElement>>;
export declare const ToastAction: React.ForwardRefExoticComponent<TO.ToastActionProps & React.RefAttributes<HTMLButtonElement>>;
export declare const ToastClose: React.ForwardRefExoticComponent<TO.ToastCloseProps & React.RefAttributes<HTMLButtonElement>>;
export declare const Toast: React.ForwardRefExoticComponent<Omit<TO.ToastProps & React.RefAttributes<HTMLLIElement>, "ref"> & React.RefAttributes<HTMLLIElement>>;
export declare const ToastViewport: React.ForwardRefExoticComponent<Omit<TO.ToastViewportProps & React.RefAttributes<HTMLOListElement>, "ref"> & React.RefAttributes<HTMLOListElement>>;
export { PixelIcon, type PixelIconName, type PixelIconProps } from './icons';
