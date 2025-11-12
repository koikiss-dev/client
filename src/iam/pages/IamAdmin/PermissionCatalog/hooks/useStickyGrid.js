import { useEffect } from "react";

/**
 * Sincroniza el scroll horizontal del header con el body.
 * Debe recibir:
 * - bodyScrollRef: div que tiene overflow-x-auto
 * - headerRef: contenedor del header (grid) cuyo scrollLeft se sincroniza
 */
export function useStickyGrid({ bodyScrollRef, headerRef }) {
  useEffect(() => {
    const bodyEl = bodyScrollRef?.current;
    const hdr = headerRef?.current;
    if (!bodyEl || !hdr) return;

    const onScroll = () => {
      // desplaza visualmente el header (el header no scrollea, pero movemos un wrapper)
      hdr.style.transform = `translateX(${-bodyEl.scrollLeft}px)`;
    };
    bodyEl.addEventListener("scroll", onScroll, { passive: true });
    return () => bodyEl.removeEventListener("scroll", onScroll);
  }, [bodyScrollRef, headerRef]);
}
