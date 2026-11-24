// 고정 씨앗 난수 (mulberry32) — 같은 씨앗이면 언제나 같은 수열을 낸다.
// React는 렌더 중 Math.random() 같은 "매번 다른 값" 호출을 막으므로(react-hooks/purity),
// 입자 배치처럼 한 번 정하면 되는 무작위 값은 이 함수로 만든다.

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
