/**
 * 추첨 공통 — **여섯 게임이 같이 쓴다.**
 *
 * 시드 난수와 "굴린 결과에 당첨자를 붙이는 법"이 게임마다 복사돼 있었다.
 * 한 곳만 고치면 게임끼리 갈리는 자리라 여기로 모았다.
 */

/**
 * 한 달에 몇 명을 뽑나 — **서버 `draws.WINNERS` 와 같은 값이어야 한다.**
 *
 * 게임은 이만큼 등수가 나올 때까지 굴린다. 참가자가 더 적으면 그만큼만이다.
 */
export const WINNERS = 3;

/** 시드 난수 — 같은 시드면 같은 수열 (mulberry32) */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 굴린 결과에 당첨자를 붙인다 — **물리를 한 번도 안 건드린다.**
 *
 * `order` 는 물리가 정한 등수다 (`order[0]` 이 1등). `winners` 는 서버가
 * 이미 뽑아 둔 당첨자들이고, **앞에서부터 1·2·3등 자리에 붙는다.**
 * 남은 자리는 나머지 참가자를 시드로 섞어 채운다.
 *
 * @param n 굴린 것의 개수 (구슬·공·캡슐·씨름꾼·돌)
 * @returns `byBall[굴린 것 번호] = 참가자 번호`
 */
export function assignWinners(
  seed: string, order: number[], n: number, winners: number[],
): number[] {
  const taken = new Set(winners);
  const rest: number[] = [];
  for (let i = 0; i < n; i++) if (!taken.has(i)) rest.push(i);
  const next = rng(`${seed}:assign`);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const byBall = new Array<number>(n);
  let k = 0;
  for (let rank = 0; rank < order.length; rank++) {
    const ball = order[rank];
    byBall[ball] = rank < winners.length ? winners[rank] : rest[k++];
  }
  // 등수에 안 들어간 자리가 남으면 채운다 (물리가 등수를 다 못 낸 경우)
  for (let i = 0; i < n; i++) if (byBall[i] === undefined) byBall[i] = rest[k++] ?? 0;
  return byBall;
}
