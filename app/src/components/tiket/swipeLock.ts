/**
 * Kunci scroll induk selama slider "Geser untuk check-in" sedang digeser.
 *
 * Di Android, ScrollView / pager horizontal (native) bisa merebut gerakan
 * jari sebelum PanResponder slider (JS) sempat mengklaimnya — terutama di HP
 * yang lambat atau saat jari sedikit miring — sehingga kenop "tidak bisa
 * digeser". Slider memanggil setSwipeLocked(true/false); layar yang berisi
 * tiket memasang scrollEnabled={!useSwipeLocked()} di ScrollView/FlatList-nya.
 */
import { useEffect, useState } from 'react';

let locked = false;
const listeners = new Set<(v: boolean) => void>();

export function setSwipeLocked(v: boolean) {
  if (locked === v) return;
  locked = v;
  listeners.forEach((l) => l(v));
}

export function useSwipeLocked(): boolean {
  const [v, setV] = useState(locked);
  useEffect(() => {
    listeners.add(setV);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}
