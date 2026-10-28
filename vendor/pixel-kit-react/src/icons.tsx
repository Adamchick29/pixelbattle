import * as React from 'react';

const shapes = {
  plus: 'M7 2h2v5h5v2H9v5H7V9H2V7h5z',
  close: 'M2 2h2v2h2v2h4V4h2V2h2v2h-2v2h-2v4h2v2h2v2h-2v-2h-2v-2H6v2H4v2H2v-2h2v-2h2V6H4V4H2z',
  check: 'M2 7h2v2h2v2h2V9h2V7h2V5h2V3h-2v2h-2v2H8v2H6V7H4V5H2z',
  'arrow-right': 'M8 2h2v2h2v2h2v4h-2v2h-2v2H8v-2h2v-2H2V6h8V4H8z',
  'arrow-left': 'M6 2h2v2H6v2h8v4H6v2h2v2H6v-2H4v-2H2V6h2V4h2z',
  'arrow-up-right': 'M4 2h10v10h-2V6h-2v2H8v2H6v2H4v2H2v-2h2v-2h2V8h2V6h2V4H4z',
  'chevron-down': 'M2 5h2v2h2v2h4V7h2V5h2v4h-2v2h-2v2H6v-2H4V9H2z',
  search: 'M4 1h6v2h2v6h-2v2H4V9H2V3h2zm0 2v6h6V3zm7 7h2v2h2v3h-3v-2h-2v-2h1z',
  folder: 'M1 3h6v2h8v9H1zm2 4v5h10V7z',
  mail: 'M1 3h14v10H1zm2 2v6h10V5h-2v2H9v2H7V7H5V5zm4 0v2h2V5z',
  heart: 'M2 2h4v2h4V2h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2v-2H0V4h2z',
  star: 'M6 0h4v4h2v2h4v4h-4v2h-2v4H6v-4H4v-2H0V6h4V4h2z',
  music: 'M7 1h7v10h-2v2H8V9h4V5H9v8H7v2H3v-2H1V9h2V7h4z',
  play: 'M3 1h2v2h3v2h3v2h3v2h-3v2H8v2H5v2H3z',
  download: 'M6 1h4v6h3v2h-2v2H9v2H7v-2H5V9H3V7h3zM1 11h2v3h10v-3h2v5H1z',
  copy: 'M5 1h9v11h-2V3H5zM2 4h9v11H2zm2 2v7h5V6z',
  trash: 'M5 1h6v2h4v2H1V3h4zM3 6h10v9H3zm2 2v5h1V8zm5 0v5h1V8z',
  pencil: 'M11 1h2v2h2v2h-2v2h-2v2H9v2H7v2H5v2H1v-4h2V9h2V7h2V5h2V3h2zM3 11v2h2v-2z',
  bell: 'M6 1h4v2h2v2h1v6h2v2H1v-2h2V5h1V3h2zm-1 4v6h6V5zM6 14h4v2H6z',
  layers: 'M6 1h4v2h4v2h2v2h-2v2h-4v2H6V9H2V7H0V5h2V3h4zm0 3v1H3v2h3v1h4V7h3V5h-3V4zM0 10h2v1h4v2h4v-2h4v-1h2v3h-2v1h-4v2H6v-2H2v-1H0z',
  settings: 'M6 0h4v3h3v3h3v4h-3v3h-3v3H6v-3H3v-3H0V6h3V3h3zm0 5v1H5v4h1v1h4v-1h1V6h-1V5z',
  info: 'M3 0h10v2h2v2h1v8h-1v2h-2v2H3v-2H1v-2H0V4h1V2h2zm1 2v1H2v10h2v1h8v-1h2V3h-2V2zM7 4h2v2H7zm0 4h2v5H7z',
  code: 'M4 3h2v2H4v2H2v2h2v2h2v2H4v-2H2V9H0V7h2V5h2zm6 0h2v2h2v2h2v2h-2v2h-2v2h-2v-2h2V9h2V7h-2V5h-2z',
  grid: 'M1 1h6v6H1zm2 2v2h2V3zm6-2h6v6H9zm2 2v2h2V3zM1 9h6v6H1zm2 2v2h2v-2zm6-2h6v6H9zm2 2v2h2v-2z',
  list: 'M1 2h3v3H1zm5 0h9v3H6zM1 7h3v3H1zm5 0h9v3H6zM1 12h3v3H1zm5 0h9v3H6z',
  menu: 'M1 2h14v2H1zm0 5h14v2H1zm0 5h14v2H1z',
  bold: 'M3 1h7v2h2v4h-2v2h2v4h-2v2H3zm3 3v3h3V4zm0 6v2h3v-2z',
  italic: 'M6 1h8v2h-3v2h-1v2H9v2H8v2H7v2h3v2H2v-2h3v-2h1V9h1V7h1V5h1V3H6z',
  underline: 'M3 1h3v8h4V1h3v9h-2v2H5v-2H3zM2 14h12v2H2z',
  'align-left': 'M1 2h14v2H1zm0 4h9v2H1zm0 4h14v2H1zm0 4h9v2H1z',
  'align-center': 'M1 2h14v2H1zm3 4h8v2H4zm-3 4h14v2H1zm3 4h8v2H4z',
  'align-right': 'M1 2h14v2H1zm5 4h9v2H6zm-5 4h14v2H1zm5 4h9v2H6z',
  link: 'M7 1h6v2h2v6h-2v2H9V9h3V4H8v3H6V3h1zM3 5h4v2H4v5h4V9h2v4H9v2H3v-2H1V7h2z',
  sun: 'M7 0h2v3H7zM7 13h2v3H7zM0 7h3v2H0zm13 0h3v2h-3zM2 1h2v2H2zm10 0h2v2h-2zM2 13h2v2H2zm10 0h2v2h-2zM5 4h6v1h1v6h-1v1H5v-1H4V5h1z',
  moon: 'M5 1h5v2H7v6h2v2h6v2h-2v2H5v-2H3v-2H1V5h2V3h2z',
  cursor: 'M2 0h2v2h2v2h2v2h2v2h2v2H8v2h2v4H6v-4H4v2H2z',
} as const;

export type PixelIconName=keyof typeof shapes;
export type PixelIconProps=Omit<React.SVGProps<SVGSVGElement>,'name'> & { name:PixelIconName;size?:number;label?:string };
export const PixelIcon=React.forwardRef<SVGSVGElement,PixelIconProps>(({name,size=16,label,...props},ref)=><svg ref={ref} width={size} height={size} viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden={label?undefined:true} role={label?'img':undefined} aria-label={label} {...props}><path fillRule="evenodd" d={shapes[name]}/></svg>);
PixelIcon.displayName='PixelIcon';
