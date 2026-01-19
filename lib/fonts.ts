import localFont from 'next/font/local';

export const cairo = localFont({
  src: '../public/fonts/Cairo-VariableFont_slnt,wght.ttf',
  variable: '--font-cairo',
  display: 'swap',
  preload: true,
});

export const roboto = localFont({
  src: '../public/fonts/Roboto-VariableFont_wdth,wght.ttf',
  variable: '--font-roboto',
  display: 'swap',
  preload: true,
}); 