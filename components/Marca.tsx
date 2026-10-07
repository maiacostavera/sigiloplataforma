// Isotipo de Sigilo: un sello de cera visto desde arriba.
export function Isotipo({ tamano = 22 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 1.6c2.1-.1 3.6.6 5.2 1.5 1.6.9 2.9 2 3.8 3.8.9 1.7 1.3 3.2 1.3 5.2 0 2.1-.6 3.8-1.6 5.4-1 1.6-2.3 2.8-4 3.6-1.6.8-3 1.3-4.9 1.2-2 0-3.5-.5-5.1-1.4C5 20 3.8 18.8 2.9 17.1 2 15.5 1.7 14 1.7 12c0-2 .4-3.6 1.4-5.2C4 5.1 5.3 3.9 7 3c1.6-.9 3-1.3 5-1.4z"
      />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="var(--papel)" strokeWidth="1.1" opacity=".75" />
      <path d="M14.6 9.1c-.5-.8-1.4-1.3-2.6-1.3-1.5 0-2.5.8-2.5 1.9 0 2.6 5.2 1.6 5.2 4.4 0 1.2-1.1 2.1-2.7 2.1-1.3 0-2.3-.6-2.8-1.5" fill="none" stroke="var(--papel)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Marca() {
  return (
    <span className="marca">
      <Isotipo />
      <span>Sigilo</span>
    </span>
  );
}
