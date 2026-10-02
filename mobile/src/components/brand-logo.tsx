import Logo from '../../assets/padosipro-logo-forscreen.svg';

/** PadosiPro house mark — vector logo for in-app screens (assets/padosipro-logo-forscreen.svg). */
export function BrandLogo({ size = 40 }: { size?: number }) {
  return <Logo width={size} height={size} />;
}
