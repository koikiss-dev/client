import { useEffect, useState } from "react";

function hsl(h,s,l,a=1){ return `hsl(${h} ${s}% ${l}% / ${a})`; }
function mod(n,m){ return ((n%m)+m)%m; }

function palette(isDark){
  const hour = new Date().getHours();
  // tono “inteligente” por hora del día
  let h = hour < 6 ? 200 : hour < 12 ? 186 : hour < 18 ? 221 : 266;
  const s = 86, l = isDark ? 64 : 45;

  return {
    accent: hsl(h,s,l), accentFg: l>=55?"#111":"#fff",
    blobA: `${h} 78% ${isDark?72:80}% / ${isDark?.16:.18}`,
    blobB: `${mod(h+28,360)} 72% ${isDark?70:78}% / ${isDark?.12:.14}`,
    blobC: `${mod(h-22,360)} 70% ${isDark?68:76}% / ${isDark?.12:.14}`,
    ring:  hsl(h,s,isDark?70:50,.45),
  };
}

export function useSmartTheme(){
  const apply = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const p = palette(isDark);
    const r = document.documentElement.style;
    r.setProperty("--accent", p.accent);
    r.setProperty("--accent-foreground", p.accentFg);
    r.setProperty("--grad-a", p.blobA);
    r.setProperty("--grad-b", p.blobB);
    r.setProperty("--grad-c", p.blobC);
    r.setProperty("--ring", p.ring);
  };

  useEffect(() => {
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes:true, attributeFilter:["class"] });
    return () => obs.disconnect();
  }, []);
}
// Hook para aplicar una paleta de colores “inteligente” basada en la hora del día y el tema (claro/oscuro)
// Define variables CSS que pueden usarse en Tailwind u otros estilos   