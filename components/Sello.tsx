import { selloSvg } from "@/lib/sello";

type Props = Parameters<typeof selloSvg>[0] & { estampar?: boolean; className?: string };

/** El sello. Con `estampar`, se estampa una sola vez al montar la pantalla. */
export function Sello({ estampar = false, className = "", ...datos }: Props) {
  return (
    <div
      className={`${estampar ? "sello-estampar" : ""} ${className}`}
      style={{ lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: selloSvg(datos) }}
    />
  );
}
