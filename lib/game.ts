// 天九扑克牌 - 游戏逻辑模块
// Teen Nine Card Game - Game Logic

// ========== 类型定义 ==========

export type Suit = 'spade' | 'club' | 'heart' | 'diamond';
export type Color = 'black' | 'red';
export type Rank = 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2' | 'A';
export type Phase = 'idle' | 'leading' | 'following' | 'trick_end' | 'game_over' | 'lipai';
export type ChainType = 'none' | 'wenZun' | 'siDaHe' | 'danA' | 'hong8';
export type ChainState = 'notOpened' | 'active' | 'ended' | 'broken';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  color: Color;
}

export interface Play {
  cards: Card[];
  cardCount: number;
  blackCount: number;
  redCount: number;
  rank: Rank | null;
  isWenZun: boolean;
  isWuZun: boolean;
  isSiDaHe: boolean;
}

export interface TrickPlay {
  playerIndex: number;
  cards: Card[];
  isFold: boolean;
  play: Play | null;
}

export interface LipaiType {
  name: string;
  multiplier: number;
  animationLevel: number;
  probability: number;
}

export interface LipaiResult {
  playerIndex: number;
  lipai: LipaiType;
  scores: number[];
}

export interface Player {
  hand: Card[];
  score: number;
  isHuman: boolean;
  name: string;
  wonCards: Card[];
}

export interface GameState {
  phase: Phase;
  players: Player[];
  currentPlayerIndex: number;
  dealerIndex: number;
  dealerStreak: number;
  trickNumber: number;
  leadPlay: TrickPlay | null;
  currentBestPlay: TrickPlay | null;
  trickPlays: TrickPlay[];
  chainType: ChainType;
  chainState: ChainState;
  chainRank: Rank | null;
  suppressionCount: number;
  isDecisiveRound: boolean;
  decisiveRoundWinner: number;
  message: string;
  roundNumber: number;
  winnerScoreBeforeDecisive: number;
  lastTrickWinnerIndex: number;
  cumulativeScores: number[];
  lastTrickBonus: number[];
  roundBonusTotal: number[];
  wenZunAppeared: boolean;
  playedCards: Card[];
  chainOpenCount: number[];
  totalDecisiveRounds: number;
  decisiveParticipation: number[];
  lipaiResult: LipaiResult | null;
}

export interface GameContext {
  black2Played: number;
  red10Played: number;
  red8Played: number;
  blackAPlayed: number;
  black3Played: number;
  black4Played: number;
  hasBlack2: boolean;
  hasRed10: boolean;
  hasRed8: boolean;
  hasBlackA: boolean;
  hasBlack3: boolean;
  hasBlack4: boolean;
  handStrength: number;
  hasScore: boolean;
  opponentsWithScore: number;
  opponentChainThreat: number;
  ownParticipationRate: number;
  opponentAvgParticipationRate: number;
  totalDecisiveRounds: number;
}

export interface DecisiveScoreDetail {
  playerId: number;
  baseScore: number;
  tongShaCoeff: number;
  decisiveMultiplier: number;
  dealerMultiplier: number;
  totalScore: number;
  isChainParticipant: boolean;
  isBaoPeiPayer: boolean;
}

export interface PlayValidation {
  valid: boolean;
  play: Play | null;
  error: string;
}

// ========== 常量定义 ==========

/** 牌面点数值 */
export const RANK_VALUES: Record<Rank, number> = {
  K: 13, Q: 12, J: 11, '10': 10, 9: 9, 8: 8,
  7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2, A: 1,
};

/** 黑牌点数（无10/8） */
export const BLACK_RANKS: Rank[] = ['K', 'Q', 'J', '9', '7', '6', '5', '4', '3', '2', 'A'];

/** 文尊链升级顺序 */
export const WENZUN_CHAIN_ORDER: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '9', 'J', 'Q', 'K'];

/** 铜锤链升级顺序 */
export const DANA_CHAIN_ORDER: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '9', 'J', 'Q', 'K'];

/** 花色符号 */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠', club: '♣', heart: '♥', diamond: '♦',
};

/** 点数显示 */
export const RANK_DISPLAY: Record<Rank, string> = {
  K: 'K', Q: 'Q', J: 'J', '10': '10', 9: '9', 8: '8',
  7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2', A: 'A',
};

/** 例牌类型定义（基础分已除以32，去掉最常见三种：六合武将、满江红、五子登科） */
export const LIPAI_TYPES: LipaiType[] = [
  { name: '四大集结', multiplier: 64, animationLevel: 2, probability: 1 / 0xa07f1c },
  { name: '八武神',   multiplier: 64, animationLevel: 2, probability: 1 / 0xa07f1c },
  { name: '双喜临门', multiplier: 32, animationLevel: 2, probability: 66e-7 },
  { name: '寒门贵子', multiplier: 32, animationLevel: 2, probability: 94e-7 },
  { name: '八方武将', multiplier: 16, animationLevel: 1, probability: 45e-6 },
  { name: '八门文武', multiplier: 8,  animationLevel: 1, probability: 22e-5 },
  { name: '四对子',   multiplier: 4,  animationLevel: 1, probability: 0.0013 },
  { name: '素一色',   multiplier: 4,  animationLevel: 1, probability: 0.0012 },
  { name: '七星武将', multiplier: 2,  animationLevel: 0, probability: 0.0025 },
  { name: '五红会',   multiplier: 2,  animationLevel: 0, probability: 0.0028 },
  { name: '六子登科', multiplier: 2,  animationLevel: 0, probability: 0.0035 },
  { name: '一顶红',   multiplier: 1,  animationLevel: 0, probability: 0.0011 },
  { name: '双尊会',   multiplier: 1,  animationLevel: 0, probability: 0.0019 },
];

/** 各牌分值 */
export const CARD_SCORES: Record<string, number> = {
  'spade-K': 6,  'club-K': 6,
  'spade-Q': 2,  'club-Q': 2,
  'spade-J': 8,  'club-J': 8,
  'spade-9': 1,  'club-9': 1,
  'spade-7': 0,  'club-7': 0,
  'spade-6': 0,  'club-6': 0,
  'spade-5': 0,  'club-5': 0,
  'spade-4': 0,  'club-4': 0,
  'spade-3': 4,  'club-3': 4,
  'spade-2': 1,  'club-2': 1,
  'spade-A': 1,  'club-A': 1,
  'diamond-K': 4, 'heart-K': 0,
  'diamond-Q': 0, 'heart-Q': 0,
  'diamond-J': 0, 'heart-J': 4,
  'diamond-10': 4,
  'diamond-9': 0, 'heart-9': 5,
  'heart-8': 1,
};

// ========== 牌型创建与验证 ==========

/** 从一组牌创建出牌组合，验证合法性 */
export function createPlay(cards: Card[]): Play | null {
  if (cards.length === 0) return null;

  const cardCount = cards.length;
  const blackCount = cards.filter(c => c.color === 'black').length;
  const redCount = cards.filter(c => c.color === 'red').length;

  // 文至尊：两张黑色A（♠A + ♣A）
  if (cardCount === 2
    && cards.every(c => c.rank === 'A' && c.color === 'black')
    && cards.some(c => c.suit === 'spade')
    && cards.some(c => c.suit === 'club')) {
    return {
      cards, cardCount: 2, blackCount: 2, redCount: 0,
      rank: 'A', isWenZun: true, isWuZun: false, isSiDaHe: false,
    };
  }

  // 武至尊：♦10 + ♥8
  if (cardCount === 2
    && cards.some(c => c.id === 'diamond-10')
    && cards.some(c => c.id === 'heart-8')) {
    return {
      cards, cardCount: 2, blackCount: 0, redCount: 2,
      rank: null, isWenZun: false, isWuZun: true, isSiDaHe: false,
    };
  }

  // 单牌
  if (cardCount === 1) {
    return {
      cards, cardCount: 1, blackCount, redCount,
      rank: cards[0].rank, isWenZun: false, isWuZun: false, isSiDaHe: false,
    };
  }

  // 多张牌必须同点数
  if (new Set(cards.map(c => c.rank)).size !== 1) return null;

  const rank = cards[0].rank;
  const isHighRank = ['K', 'Q', 'J', '9'].includes(rank);

  // 非高牌不能混色，且2张时必须纯黑或纯红
  if ((!isHighRank && blackCount > 0 && redCount > 0)
    || (!isHighRank && cardCount === 2 && blackCount !== 2 && redCount !== 2)) {
    return null;
  }

  // 不能有重复的牌
  if (new Set(cards.map(c => c.id)).size !== cardCount) return null;

  return {
    cards, cardCount, blackCount, redCount, rank,
    isWenZun: false, isWuZun: false,
    isSiDaHe: cardCount === 4 && isHighRank && blackCount === 2 && redCount === 2,
  };
}

/** 判断出牌是否能触发链条开启 */
export function canOpenChain(chainType: ChainType, play: Play): boolean {
  switch (chainType) {
    case 'danA':
      return play.cardCount === 1 && play.rank === '2' && play.blackCount === 1;
    case 'hong8':
      return play.cardCount === 1 && play.rank === '10' && play.redCount === 1;
    default:
      return false;
  }
}

/** 判断新出牌是否能压过当前最大牌 */
export function canBeat(
  newPlay: Play,
  bestPlay: Play,
  chainType: ChainType,
  chainState: ChainState,
  chainRank: Rank | null,
): boolean {
  // 链条激活状态下，按链规则压牌
  if (chainState === 'active' && chainType !== 'none') {
    switch (chainType) {
      case 'wenZun': {
        if (newPlay.cardCount !== 2 || newPlay.blackCount !== 2 || newPlay.redCount !== 0 || !chainRank) return false;
        const idx = WENZUN_CHAIN_ORDER.indexOf(chainRank);
        if (idx === -1 || idx >= WENZUN_CHAIN_ORDER.length - 1) return false;
        const nextRank = WENZUN_CHAIN_ORDER[idx + 1];
        return newPlay.rank === nextRank;
      }
      case 'siDaHe':
        if (!newPlay.isSiDaHe || !chainRank || !newPlay.rank) return false;
        return RANK_VALUES[newPlay.rank] > RANK_VALUES[chainRank];
      case 'danA': {
        if (newPlay.cardCount !== 1 || newPlay.blackCount !== 1 || !chainRank) return false;
        const idx = DANA_CHAIN_ORDER.indexOf(chainRank);
        if (idx === -1 || idx >= DANA_CHAIN_ORDER.length - 1) return false;
        const nextRank = DANA_CHAIN_ORDER[idx + 1];
        return newPlay.rank === nextRank;
      }
      default:
        return false;
    }
  }

  // 普通压牌规则
  return chainState !== 'ended'
    && !bestPlay.isWuZun
    && newPlay.cardCount === bestPlay.cardCount
    && newPlay.blackCount === bestPlay.blackCount
    && newPlay.redCount === bestPlay.redCount
    && (bestPlay.isWenZun
      ? newPlay.rank === '2' && newPlay.blackCount === 2 && newPlay.redCount === 0
      : newPlay.rank !== null && bestPlay.rank !== null && RANK_VALUES[newPlay.rank] > RANK_VALUES[bestPlay.rank]);
}

/** 判断手牌中是否有可出的牌 */
export function canPlayCards(
  hand: Card[],
  bestPlay: Play,
  chainType: ChainType,
  chainState: ChainState,
  chainRank: Rank | null,
  playerScore: number,
  isDecisiveRound: boolean,
): boolean {
  if (isDecisiveRound && playerScore === 0) return false;
  return findValidPlays(hand, bestPlay, chainType, chainState, chainRank, playerScore, isDecisiveRound).length > 0;
}

/** 查找所有合法出牌组合 */
export function findValidPlays(
  hand: Card[],
  bestPlay: Play,
  chainType: ChainType,
  chainState: ChainState,
  chainRank: Rank | null,
  playerScore: number,
  isDecisiveRound: boolean,
): Play[] {
  // 决胜轮零分锁死，不能出牌
  if (isDecisiveRound && playerScore === 0) return [];

  const results: Play[] = [];
  const blackCards = hand.filter(c => c.color === 'black');
  const redCards = hand.filter(c => c.color === 'red');
  const blackCombos = combinations(blackCards, bestPlay.blackCount);
  const redCombos = combinations(redCards, bestPlay.redCount);

  for (const bc of blackCombos) {
    for (const rc of redCombos) {
      const play = createPlay([...bc, ...rc]);
      if (play && canBeat(play, bestPlay, chainType, chainState, chainRank)) {
        results.push(play);
      }
    }
  }

  // 去重（同点数只保留一个）
  const seen = new Set<string>();
  return results.filter(p => {
    const key = p.rank ?? (p.isWuZun ? 'wuzun' : 'unknown');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 生成组合 C(n,k) */
export function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: T[][] = [];
  function helper(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      helper(i + 1, current);
      current.pop();
    }
  }
  helper(0, []);
  return result;
}

// ========== 游戏状态管理 ==========

/** 创建初始游戏状态 */
export function createInitialState(): GameState {
  return {
    phase: 'idle',
    players: [
      { hand: [], score: 0, isHuman: true,  name: '自己', wonCards: [] },
      { hand: [], score: 0, isHuman: false, name: '上家', wonCards: [] },
      { hand: [], score: 0, isHuman: false, name: '对家', wonCards: [] },
      { hand: [], score: 0, isHuman: false, name: '下家', wonCards: [] },
    ],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    dealerStreak: 1,
    trickNumber: 0,
    leadPlay: null,
    currentBestPlay: null,
    trickPlays: [],
    chainType: 'none',
    chainState: 'notOpened',
    chainRank: null,
    suppressionCount: 0,
    isDecisiveRound: false,
    decisiveRoundWinner: -1,
    message: '点击"开始游戏"',
    roundNumber: 1,
    winnerScoreBeforeDecisive: 0,
    lastTrickWinnerIndex: -1,
    cumulativeScores: [0, 0, 0, 0],
    lastTrickBonus: [0, 0, 0, 0],
    roundBonusTotal: [0, 0, 0, 0],
    wenZunAppeared: false,
    playedCards: [],
    chainOpenCount: [0, 0, 0, 0],
    totalDecisiveRounds: 0,
    decisiveParticipation: [0, 0, 0, 0],
    lipaiResult: null,
  };
}

/** Fisher-Yates 洗牌（3轮增强随机） */
function shuffleCards(cards: Card[]): Card[] {
  const result = [...cards];
  for (let round = 0; round < 3; round++) {
    for (let i = result.length - 1; i > 0; i--) {
      let j: number;
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        j = buf[0] % (i + 1);
      } else {
        j = Math.floor(Math.random() * (i + 1));
      }
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
}

/** 生成32张天九牌 */
function createDeck(): Card[] {
  const deck: Card[] = [];
  // 黑牌22张（♠♣ K→A，无10/8）
  for (const rank of BLACK_RANKS) {
    deck.push({ id: `spade-${rank}`, suit: 'spade', rank, color: 'black' });
    deck.push({ id: `club-${rank}`,  suit: 'club',  rank, color: 'black' });
  }
  // 红牌10张（♥♦ K/Q/J/9 + ♦10 + ♥8）
  for (const rank of ['K', 'Q', 'J', '9'] as Rank[]) {
    deck.push({ id: `heart-${rank}`,   suit: 'heart',   rank, color: 'red' });
    deck.push({ id: `diamond-${rank}`, suit: 'diamond', rank, color: 'red' });
  }
  deck.push({ id: 'diamond-10', suit: 'diamond', rank: '10', color: 'red' });
  deck.push({ id: 'heart-8',    suit: 'heart',   rank: '8',  color: 'red' });
  return deck;
}

/** 检测例牌（天胡） */
function detectLipai(hand: Card[]): LipaiType | null {
  if (hand.length !== 8) return null;

  const idSet = new Set(hand.map(c => c.id));
  const hasBoth = (a: string, b: string) => idSet.has(a) && idSet.has(b);

  const redCards = hand.filter(c => c.color === 'red');
  const blackCards = hand.filter(c => c.color === 'black');
  const redCount = redCards.length;
  const blackCount = blackCards.length;

  const totalScore = hand.reduce((sum, c) => sum + (CARD_SCORES[c.id] ?? 0), 0);
  const hasZeroCard = hand.some(c => (CARD_SCORES[c.id] ?? 0) === 0);

  // 统计黑/红各点数的张数
  const blackRankCount: Record<string, number> = {};
  const redRankCount: Record<string, number> = {};
  for (const c of hand) {
    if (c.color === 'black') blackRankCount[c.rank] = (blackRankCount[c.rank] || 0) + 1;
    else redRankCount[c.rank] = (redRankCount[c.rank] || 0) + 1;
  }

  // 对子数
  let pairCount = 0;
  for (const rank of Object.keys(blackRankCount)) {
    if (blackRankCount[rank] === 2) pairCount++;
  }
  for (const rank of Object.keys(redRankCount)) {
    if (redRankCount[rank] === 2) pairCount++;
  }

  const redRanks = new Set(redCards.map(c => c.rank));

  // 四大集结：♠♣KQJ9全部黑牌
  if (hasBoth('spade-K', 'club-K') && hasBoth('spade-Q', 'club-Q')
    && hasBoth('spade-J', 'club-J') && hasBoth('spade-9', 'club-9')) {
    return LIPAI_TYPES[0];
  }
  // 八武神：♥♦KQJ9全部红牌
  if (hasBoth('heart-K', 'diamond-K') && hasBoth('heart-Q', 'diamond-Q')
    && hasBoth('heart-J', 'diamond-J') && hasBoth('heart-9', 'diamond-9')) {
    return LIPAI_TYPES[1];
  }
  // 双喜临门：K/Q/J/9中有2个同时有黑白对
  {
    let count = 0;
    for (const rank of ['K', 'Q', 'J', '9']) {
      if (blackRankCount[rank] === 2 && redRankCount[rank] === 2) count++;
    }
    if (count === 2) return LIPAI_TYPES[2];
  }
  // 寒门贵子：9张低分牌中至少8张
  {
    const lowCards = new Set([
      'spade-3', 'club-3', 'spade-2', 'club-2',
      'spade-A', 'club-A', 'diamond-9', 'heart-9', 'heart-8',
    ]);
    let count = 0;
    for (const id of idSet) {
      if (lowCards.has(id)) count++;
    }
    if (count >= 8) return LIPAI_TYPES[3];
  }
  // 八方武将：8张红牌
  if (redCount === 8) return LIPAI_TYPES[4];
  // 八门文武：4黑4红，各有KQJ9各1张
  if (blackCount === 4 && redCount === 4
    && blackRankCount['K'] === 1 && blackRankCount['Q'] === 1
    && blackRankCount['J'] === 1 && blackRankCount['9'] === 1
    && redRankCount['K'] === 1 && redRankCount['Q'] === 1
    && redRankCount['J'] === 1 && redRankCount['9'] === 1) {
    return LIPAI_TYPES[5];
  }
  // 四对子：4个对子
  if (pairCount === 4) return LIPAI_TYPES[6];
  // 素一色：所有牌0分
  if (totalScore === 0) return LIPAI_TYPES[7];
  // 七星武将：7张红牌
  if (redCount === 7) return LIPAI_TYPES[8];
  // 五红会：♠♣QJ + ♥9
  if (hasBoth('spade-Q', 'club-Q') && hasBoth('spade-J', 'club-J') && idSet.has('heart-9')) {
    return LIPAI_TYPES[9];
  }
  // 六子登科：6张红牌，6种不同点数含KQJ9/10/8
  if (redCount === 6 && redRanks.size === 6
    && redRanks.has('K') && redRanks.has('Q') && redRanks.has('J')
    && redRanks.has('9') && redRanks.has('10') && redRanks.has('8')) {
    return LIPAI_TYPES[10];
  }
  // 一顶红：总分1
  if (totalScore === 1) return LIPAI_TYPES[11];
  // 双尊会：♠♣A + ♦10 + ♥8
  if (hasBoth('spade-A', 'club-A') && idSet.has('diamond-10') && idSet.has('heart-8')) {
    return LIPAI_TYPES[12];
  }
  return null;
}

/** 计算例牌得分（赢家从所有人收钱，和庄家间乘庄家倍率，闲家间不乘） */
function calculateLipaiScores(
  winnerIndex: number,
  multiplier: number,
  dealerIndex: number,
  dealerStreak: number,
): number[] {
  const dealerMultiplier = Math.pow(2, dealerStreak);
  const scores = [0, 0, 0, 0];

  for (let i = 0; i < 4; i++) {
    if (i === winnerIndex) continue;
    // 涉及庄家（赢家是庄家或对方是庄家）则乘庄家倍率，闲家间不乘
    const amount = (winnerIndex === dealerIndex || i === dealerIndex)
      ? multiplier * dealerMultiplier
      : multiplier;
    scores[i] -= amount;
    scores[winnerIndex] += amount;
  }

  return scores;
}

/** 开始新一轮（发牌） */
export function startRound(state: GameState): GameState {
  const deck = shuffleCards(createDeck());
  const hands: Card[][] = [[], [], [], []];
  for (let i = 0; i < 32; i++) {
    hands[i % 4].push(deck[i]);
  }
  // 排序：先黑后红，同色按点数降序
  for (const hand of hands) {
    hand.sort((a, b) =>
      a.color !== b.color ? (a.color === 'black' ? -1 : 1) : RANK_VALUES[b.rank] - RANK_VALUES[a.rank]
    );
  }

  const players = state.players.map((p, i) => ({
    ...p, hand: hands[i], score: 0, wonCards: [],
  }));

  // 座位优先级（庄家=0，逆时针递增）
  const seatPriority = (idx: number) =>
    idx === state.dealerIndex ? 0
      : idx === (state.dealerIndex + 3) % 4 ? 1
        : idx === (state.dealerIndex + 2) % 4 ? 2 : 3;

  // 检测例牌
  let bestLipai: { playerIndex: number; lipai: LipaiType; seat: number } | null = null;
  for (let i = 0; i < 4; i++) {
    const lipai = detectLipai(hands[i]);
    if (lipai) {
      const seat = seatPriority(i);
      if (!bestLipai || lipai.probability < bestLipai.lipai.probability
        || (lipai.probability === bestLipai.lipai.probability && seat < bestLipai.seat)) {
        bestLipai = { playerIndex: i, lipai, seat };
      }
    }
  }

  // 例牌天胡
  if (bestLipai) {
    const scores = calculateLipaiScores(bestLipai.playerIndex, bestLipai.lipai.multiplier, state.dealerIndex, state.dealerStreak);
    const lipaiResult: LipaiResult = {
      playerIndex: bestLipai.playerIndex,
      lipai: bestLipai.lipai,
      scores,
    };
    return {
      ...state,
      phase: 'lipai',
      players,
      currentPlayerIndex: state.dealerIndex,
      trickNumber: 1,
      leadPlay: null,
      currentBestPlay: null,
      trickPlays: [],
      chainType: 'none',
      chainState: 'notOpened',
      chainRank: null,
      suppressionCount: 0,
      isDecisiveRound: false,
      decisiveRoundWinner: -1,
      message: `例牌天胡！${players[bestLipai.playerIndex].name}【${bestLipai.lipai.name}】${bestLipai.lipai.multiplier}分`,
      winnerScoreBeforeDecisive: 0,
      lastTrickWinnerIndex: -1,
      cumulativeScores: state.cumulativeScores,
      lastTrickBonus: [0, 0, 0, 0],
      roundBonusTotal: [0, 0, 0, 0],
      wenZunAppeared: false,
      playedCards: [],
      chainOpenCount: state.chainOpenCount,
      totalDecisiveRounds: state.totalDecisiveRounds,
      decisiveParticipation: state.decisiveParticipation,
      lipaiResult,
    };
  }

  // 正常开局
  return {
    ...state,
    phase: 'leading',
    players,
    currentPlayerIndex: state.dealerIndex,
    trickNumber: 1,
    leadPlay: null,
    currentBestPlay: null,
    trickPlays: [],
    chainType: 'none',
    chainState: 'notOpened',
    chainRank: null,
    suppressionCount: 0,
    isDecisiveRound: false,
    decisiveRoundWinner: -1,
    message: `${players[state.dealerIndex].name}是庄家，先出牌`,
    winnerScoreBeforeDecisive: 0,
    lastTrickWinnerIndex: -1,
    cumulativeScores: state.cumulativeScores,
    lastTrickBonus: [0, 0, 0, 0],
    roundBonusTotal: [0, 0, 0, 0],
    wenZunAppeared: false,
    playedCards: [],
    chainOpenCount: state.chainOpenCount,
    totalDecisiveRounds: state.totalDecisiveRounds,
    decisiveParticipation: state.decisiveParticipation,
    lipaiResult: null,
  };
}

/** 从手牌中移除已出的牌 */
export function removeCards(hand: Card[], played: Card[]): Card[] {
  const playedIds = new Set(played.map(c => c.id));
  return hand.filter(c => !playedIds.has(c.id));
}

// ========== AI 上下文构建 ==========

/** 构建 AI 决策上下文 */
export function buildGameContext(
  hand: Card[],
  playedCards: Card[],
  score: number,
  isDecisiveRound: boolean,
  wenZunAppeared: boolean,
  allScores?: number[],
  chainOpenCount?: number[],
  totalDecisiveRounds?: number,
  decisiveParticipation?: number[],
  currentPlayerIndex?: number,
): GameContext {
  const black2Played = playedCards.filter(c => c.rank === '2' && c.color === 'black').length;
  const red10Played = playedCards.filter(c => c.id === 'diamond-10').length;
  const red8Played = playedCards.filter(c => c.id === 'heart-8').length;
  const blackAPlayed = playedCards.filter(c => c.rank === 'A' && c.color === 'black').length;
  const black3Played = playedCards.filter(c => c.rank === '3' && c.color === 'black').length;
  const black4Played = playedCards.filter(c => c.rank === '4' && c.color === 'black').length;

  const hasBlack2 = hand.some(c => c.rank === '2' && c.color === 'black');
  const hasRed10 = hand.some(c => c.id === 'diamond-10');
  const hasRed8 = hand.some(c => c.id === 'heart-8');
  const hasBlackA = hand.some(c => c.rank === 'A' && c.color === 'black');
  const hasBlack3 = hand.some(c => c.rank === '3' && c.color === 'black');
  const hasBlack4 = hand.some(c => c.rank === '4' && c.color === 'black');

  // 手牌强度评估
  let handStrength = 0;
  handStrength += 0.12 * hand.filter(c => c.color === 'black' && ['K', 'Q', 'J'].includes(c.rank)).length;
  const rankCounts: Record<string, number> = {};
  for (const c of hand) rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  handStrength += 0.08 * Object.values(rankCounts).filter(v => v >= 2).length;
  if (hand.filter(c => c.rank === 'A' && c.color === 'black').length === 2) handStrength += 0.3;
  if (hasRed10 && hasRed8) handStrength += 0.25;
  if (hasBlackA) handStrength += 0.1;
  handStrength += 0.06 * hand.filter(c => c.color === 'red' && ['K', 'Q', 'J', '9'].includes(c.rank)).length;
  handStrength = Math.min(1, handStrength);

  // 对手有分情况
  let opponentsWithScore = 0;
  let opponentChainThreat = 0.3;
  if (allScores && allScores.length === 4) {
    const scoredCount = allScores.filter(s => s >= 1).length;
    opponentsWithScore = score >= 1 ? Math.max(0, scoredCount - 1) : scoredCount;
    if (decisiveParticipation && totalDecisiveRounds && totalDecisiveRounds > 0) {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < 4; i++) {
        if (allScores[i] >= 1) {
          sum += decisiveParticipation[i] / totalDecisiveRounds;
          count++;
        }
      }
      if (count > 0) opponentChainThreat = sum / count;
    }
  }

  // 决胜轮参与率
  let ownParticipationRate = 0.5;
  let opponentAvgParticipationRate = 0.5;
  const totalDR = totalDecisiveRounds ?? 0;
  if (decisiveParticipation && totalDR > 0) {
    if (currentPlayerIndex !== undefined) {
      ownParticipationRate = decisiveParticipation[currentPlayerIndex] / totalDR;
    }
    let sum = 0;
    let count = 0;
    for (let i = 0; i < 4; i++) {
      if (currentPlayerIndex === undefined || i !== currentPlayerIndex) {
        sum += decisiveParticipation[i] / totalDR;
        count++;
      }
    }
    if (count > 0) opponentAvgParticipationRate = sum / count;
  }

  return {
    black2Played, red10Played, red8Played, blackAPlayed, black3Played, black4Played,
    hasBlack2, hasRed10, hasRed8, hasBlackA, hasBlack3, hasBlack4,
    handStrength,
    hasScore: score >= 1 || isDecisiveRound,
    opponentsWithScore,
    opponentChainThreat,
    ownParticipationRate,
    opponentAvgParticipationRate,
    totalDecisiveRounds: totalDR,
  };
}

// ========== AI 出牌逻辑 ==========

/** AI 选择垫牌卡片 */
export function selectDiscardCards(
  hand: Card[],
  count: number,
  isDecisiveRound = false,
  wenZunAppeared = false,
  context?: GameContext,
): Card[] {
  const n = Math.min(count, hand.length);
  if (n <= 0) return [];

  const rankCounts: Record<string, number> = {};
  for (const c of hand) rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;

  const hasBothBlackA = hand.filter(c => c.rank === 'A' && c.color === 'black').length === 2;
  const hasRed10 = hand.some(c => c.id === 'diamond-10');
  const hasRed8 = hand.some(c => c.id === 'heart-8');
  const hasWuZun = hasRed10 && hasRed8;
  const isDecisiveNotWenZun = isDecisiveRound && !wenZunAppeared;

  const remainingBlack2 = context ? 2 - context.black2Played - (context.hasBlack2 ? 1 : 0) : 2;
  const remainingRed10 = context ? (context.red10Played >= 1 ? 0 : context.hasRed10 ? 0 : 1) : 1;
  const remainingRed8 = context ? (context.red8Played >= 1 ? 0 : context.hasRed8 ? 0 : 1) : 1;
  const handRatio = hand.length / 8;
  const isStrongHand = !!context && context.handStrength >= 0.45;

  const scored = hand.map(card => {
    let priority = 0;

    // 保护关键组合（文至尊对A、武至尊10+8）
    if ((card.rank === 'A' && card.color === 'black' && hasBothBlackA)
      || (hasWuZun && (card.id === 'diamond-10' || card.id === 'heart-8'))) {
      return { card, priority: -100 };
    }

    // 单黑A策略
    if (card.rank === 'A' && card.color === 'black' && !hasBothBlackA) {
      const drFactor = context ? Math.min(1, context.totalDecisiveRounds / 5) : 0;
      const participationAdj = context ? Math.round((0.5 - context.ownParticipationRate) * 10 * drFactor) : 0;
      if (isDecisiveRound) {
        const scoreFactor = context ? context.opponentsWithScore / 3 : 1;
        const chainFactor = context ? context.opponentChainThreat : 0.3;
        if (isStrongHand) {
          if (remainingBlack2 === 0) return { card, priority: -15 + participationAdj };
          if (remainingBlack2 === 1) return { card, priority: -15 - Math.round(15 * handRatio * scoreFactor) + participationAdj };
          return { card, priority: -15 - Math.round(35 * handRatio * scoreFactor) - Math.round(5 * chainFactor * scoreFactor) + participationAdj };
        }
        if (remainingBlack2 === 0) return { card, priority: -10 + participationAdj };
        return { card, priority: -10 - Math.round(15 * handRatio * scoreFactor) - Math.round(5 * chainFactor * scoreFactor) + participationAdj };
      }
      return isStrongHand ? { card, priority: -12 } : { card, priority: 0 };
    }

    // ♥8策略（非武至尊）
    if (card.id === 'heart-8' && !hasWuZun) {
      const drFactor = context ? Math.min(1, context.totalDecisiveRounds / 5) : 0;
      const participationAdj = context ? Math.round((0.5 - context.ownParticipationRate) * 8 * drFactor) : 0;
      if (isDecisiveRound) {
        const scoreFactor = context ? context.opponentsWithScore / 3 : 1;
        if (remainingRed10 === 0) return { card, priority: -8 + participationAdj };
        return { card, priority: -8 - Math.round(22 * handRatio * scoreFactor) + participationAdj };
      }
      return isStrongHand ? { card, priority: -12 } : { card, priority: -5 };
    }

    // ♦10策略（非武至尊）
    if (card.id === 'diamond-10' && !hasWuZun) {
      if (isDecisiveRound && remainingRed8 > 0) {
        if (!isStrongHand && context?.hasScore && isDecisiveNotWenZun) {
          return { card, priority: -8 - Math.round(37 * handRatio) };
        }
        if (!isStrongHand && context?.hasScore) {
          return { card, priority: -8 - Math.round(17 * handRatio) };
        }
        return { card, priority: -8 };
      }
      if (isStrongHand && remainingRed8 > 0) return { card, priority: -10 };
      return { card, priority: -5 };
    }

    // 低分黑牌（2/3/4）策略
    if (card.color === 'black' && ['2', '3', '4'].includes(card.rank)) {
      if (isDecisiveNotWenZun && !isStrongHand && context?.hasScore) {
        if (card.rank === '2') return { card, priority: -70 };
        if (card.rank === '3') return { card, priority: -40 };
        if (card.rank === '4') return { card, priority: -20 };
      } else if (isDecisiveRound && !isStrongHand && context?.hasScore) {
        if (card.rank === '2') priority -= 30;
        if (card.rank === '3') priority -= 12;
        if (card.rank === '4') priority -= 5;
      } else if (!isDecisiveRound && !isStrongHand && context?.hasScore && context.handStrength < 0.3 && card.rank === '2') {
        priority -= 20;
      }
    }

    // 非决胜轮有对子时降低2/3/4优先级
    if (!isDecisiveRound && card.color === 'black' && ['2', '3', '4'].includes(card.rank) && rankCounts[card.rank] >= 2) {
      priority -= 20;
    }

    // 单牌优先出，对子中性，三张以上不想出
    if (rankCounts[card.rank] === 1) priority += 60;
    else if (rankCounts[card.rank] === 2) priority += 0;
    else priority -= 40;

    // 黑牌价值高，红大牌价值低
    if (card.color === 'black') {
      priority += 14 - RANK_VALUES[card.rank];
    } else {
      if (RANK_VALUES[card.rank] >= 11) priority -= 20;
      else if (card.id === 'diamond-10' || card.id === 'heart-8') priority -= 15;
      else priority += 14 - RANK_VALUES[card.rank];
    }

    return { card, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, n).map(s => s.card);
}

/** AI 选择领出牌 */
export function aiSelectLeadCards(
  hand: Card[],
  isDecisiveRound = false,
  wenZunAppeared = false,
  context?: GameContext,
): Card[] {
  if (hand.length === 0) return [];

  const ctx = context ?? {
    black2Played: 0, red10Played: 0, red8Played: 0,
    blackAPlayed: 0, black3Played: 0, black4Played: 0,
    hasBlack2: hand.some(c => c.rank === '2' && c.color === 'black'),
    hasRed10: hand.some(c => c.id === 'diamond-10'),
    hasRed8: hand.some(c => c.id === 'heart-8'),
    hasBlackA: hand.some(c => c.rank === 'A' && c.color === 'black'),
    hasBlack3: hand.some(c => c.rank === '3' && c.color === 'black'),
    hasBlack4: hand.some(c => c.rank === '4' && c.color === 'black'),
    handStrength: 0.3,
    hasScore: false,
    opponentsWithScore: 2,
    opponentChainThreat: 0.3,
    ownParticipationRate: 0.5,
    opponentAvgParticipationRate: 0.5,
    totalDecisiveRounds: 0,
  };

  // 生成所有可能的出牌组合
  const allPlays: Play[] = [];
  for (let n = 1; n <= Math.min(4, hand.length); n++) {
    for (const combo of combinations(hand, n)) {
      const play = createPlay(combo);
      if (play) allPlays.push(play);
    }
  }

  // 去重
  const seen = new Set<string>();
  const uniquePlays = allPlays.filter(p => {
    const key = `${p.cardCount}-${p.blackCount}-${p.redCount}-${p.rank}-${p.isWenZun}-${p.isWuZun}-${p.isSiDaHe}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniquePlays.length === 0) return [hand[0]];

  const isDecisiveNotWenZun = isDecisiveRound && !wenZunAppeared;
  const remainingBlack2 = 2 - ctx.black2Played - (ctx.hasBlack2 ? 1 : 0);
  const remainingRed10 = ctx.red10Played >= 1 ? 0 : ctx.hasRed10 ? 0 : 1;
  const remainingRed8 = ctx.red8Played >= 1 ? 0 : ctx.hasRed8 ? 0 : 1;
  const handRatio = hand.length / 8;
  const isStrongHand = ctx.handStrength >= 0.45;

  const scored = uniquePlays.map(play => {
    let score = 8 * play.cardCount;
    if (play.rank) score += RANK_VALUES[play.rank];
    if (play.isWenZun) score -= 20;
    if (play.isSiDaHe) score -= 15;
    if (play.isWuZun) {
      score = isStrongHand ? score - 25 : score - 30;
    }

    if (play.cardCount === 1) {
      // 单黑A
      if (play.rank === 'A' && play.blackCount === 1) {
        if (isDecisiveRound) {
          const sf = ctx.opponentsWithScore / 3;
          const cf = ctx.opponentChainThreat;
          const drFactor = Math.min(1, ctx.totalDecisiveRounds / 5);
          const ownAdj = (0.5 - ctx.ownParticipationRate) * 8 * drFactor;
          const oppAdj = (0.5 - ctx.opponentAvgParticipationRate) * 4 * drFactor;
          if (isStrongHand) {
            if (remainingBlack2 === 0) score += 3;
            else {
              score += Math.round((remainingBlack2 === 1 ? 6 : 12) * handRatio * sf);
              score += Math.round(5 * cf * sf);
            }
            score += Math.round(ownAdj);
            score += Math.round(oppAdj);
          } else {
            if (remainingBlack2 === 0) score += 3;
            else {
              score += Math.round(15 * handRatio * sf);
              score += Math.round(5 * cf * sf);
              if (isDecisiveNotWenZun && ctx.hasScore && ctx.handStrength >= 0.4) score -= 3;
              score += Math.round(1.5 * ownAdj);
              score += Math.round(1.2 * oppAdj);
            }
          }
        } else {
          score = isStrongHand ? score + 6 : score + 0;
        }
      }
      // 单黑2
      else if (play.rank === '2' && play.blackCount === 1) {
        if (isDecisiveNotWenZun && !isStrongHand && ctx.hasScore) score += 18;
        else if (isDecisiveNotWenZun && isStrongHand) score += 4;
        else if (isDecisiveRound && ctx.hasScore && !isStrongHand) score += 10;
        else score += 3;
      }
      // 单黑3
      else if (play.rank === '3' && play.blackCount === 1) {
        if (isDecisiveNotWenZun && !isStrongHand && ctx.hasScore) score += 8;
        else score += 1;
      }
      // 单黑4
      else if (play.rank === '4' && play.blackCount === 1) {
        if (isDecisiveNotWenZun && !isStrongHand && ctx.hasScore) score += 4;
        else score += 0;
      }
      // 红八
      else if (play.rank === '8' && play.redCount === 1) {
        if (ctx.hasRed10) score += 22;
        else if (isDecisiveRound) {
          const sf = ctx.opponentsWithScore / 3;
          const cf = ctx.opponentChainThreat;
          const drFactor = Math.min(1, ctx.totalDecisiveRounds / 5);
          const ownAdj = (0.5 - ctx.ownParticipationRate) * 6 * drFactor;
          const oppAdj = (0.5 - ctx.opponentAvgParticipationRate) * 3 * drFactor;
          if (remainingRed10 === 0) score += 3;
          else {
            score += Math.round(10 * handRatio * sf);
            score += Math.round(4 * cf * sf);
          }
          score += Math.round(ownAdj);
          score += Math.round(oppAdj);
        } else {
          score = isStrongHand ? score + 6 : score + 0;
        }
      }
      // 红十
      else if (play.rank === '10' && play.redCount === 1) {
        if (ctx.hasRed8) score += 22;
        else if (isDecisiveRound && remainingRed8 > 0) {
          if (!isStrongHand && ctx.hasScore) score += Math.round(12 * handRatio);
          else if (ctx.hasScore) score += 5;
          else score += 3;
        } else score += 3;
      }
    }

    // 对子加分（低点数对子更适合领出）
    if (play.cardCount === 2 && !play.isWenZun && !play.isWuZun && play.rank && RANK_VALUES[play.rank] <= 3) {
      score += 5;
      if (isDecisiveNotWenZun && play.rank === '2') score += 8;
    }

    return { play, score };
  });

  scored.sort((a, b) => a.score - b.score);
  const topN = Math.min(3, scored.length);
  return scored[Math.floor(Math.random() * topN)].play.cards;
}

/** AI 选择跟牌 */
export function aiSelectFollowCards(
  hand: Card[],
  bestPlay: Play,
  chainType: ChainType,
  chainState: ChainState,
  chainRank: Rank | null,
  playerScore: number,
  isDecisiveRound: boolean,
  wenZunAppeared = false,
  context?: GameContext,
): { cards: Card[]; fold: boolean } {
  // 决胜轮零分锁死
  if (isDecisiveRound && playerScore === 0) return { cards: [], fold: true };

  const validPlays = findValidPlays(hand, bestPlay, chainType, chainState, chainRank, playerScore, isDecisiveRound);
  if (validPlays.length === 0) return { cards: [], fold: true };

  // 过滤掉会拆武至尊的出牌
  const hasRed10 = hand.some(c => c.id === 'diamond-10');
  const hasRed8 = hand.some(c => c.id === 'heart-8');
  let filtered = hasRed10 && hasRed8
    ? validPlays.filter(p => {
      if (p.isWuZun) return true;
      const uses10 = p.cards.some(c => c.id === 'diamond-10');
      const uses8 = p.cards.some(c => c.id === 'heart-8');
      return !uses10 && !uses8;
    })
    : validPlays;

  const isDecisiveNotWenZun = isDecisiveRound && !wenZunAppeared;
  const isStrongHand = !!context && context.handStrength >= 0.45;

  // 决胜轮+链未开启时，避免出黑2开铜锤链
  if (isDecisiveNotWenZun && chainState === 'notOpened') {
    const remainingBlack2 = context ? 2 - context.black2Played - (context.hasBlack2 ? 1 : 0) : 2;
    const shouldAvoid = !isStrongHand && remainingBlack2 > 0;
    const filtered2 = filtered.filter(p => !shouldAvoid || p.cardCount !== 1 || p.rank !== '2' || p.blackCount !== 1);
    if (filtered2.length > 0) filtered = filtered2;
  }

  let candidates = filtered.length > 0 ? filtered : validPlays.length > 0 ? validPlays : validPlays;

  // 决胜轮逻辑
  if (isDecisiveRound) {
    // 链未开启，需要触发条件
    if (chainState === 'notOpened') {
      const openable = candidates.filter(p => canOpenChain(chainType, p));
      if (openable.length > 0) {
        openable.sort((a, b) => (a.rank ? RANK_VALUES[a.rank] : 0) - (b.rank ? RANK_VALUES[b.rank] : 0));
        return { cards: openable[0].cards, fold: false };
      }
      return { cards: [], fold: true };
    }
    // 链已激活，出最小能压的牌
    candidates.sort((a, b) => {
      const av = a.rank ? RANK_VALUES[a.rank] : 0;
      const bv = b.rank ? RANK_VALUES[b.rank] : 0;
      let adjA = av;
      let adjB = bv;
      if (context?.hasScore && context.handStrength < 0.3) {
        if (a.cardCount === 1 && a.blackCount === 1 && ['2', '3', '4'].includes(a.rank || '')) adjB -= 5;
        if (b.cardCount === 1 && b.blackCount === 1 && ['2', '3', '4'].includes(b.rank || '')) adjA -= 5;
      }
      return adjB - adjA;
    });
    return { cards: candidates[0].cards, fold: false };
  }

  // 非决胜轮：90%概率压牌，10%概率垫牌
  candidates.sort((a, b) => (a.rank ? RANK_VALUES[a.rank] : 0) - (b.rank ? RANK_VALUES[b.rank] : 0));
  return Math.random() > 0.9
    ? { cards: [], fold: true }
    : { cards: candidates[0].cards, fold: false };
}

// ========== 出牌处理 ==========

/** 计算链条更新 */
function updateChain(
  chainType: ChainType,
  chainState: ChainState,
  chainRank: Rank | null,
  suppressionCount: number,
  play: Play,
): { chainType: ChainType; chainState: ChainState; chainRank: Rank | null; suppressionCount: number } {
  if (chainState === 'active' && chainType !== 'none') {
    const newRank = play.rank ?? chainRank;
    if (chainType === 'hong8') {
      return { chainType, chainState: 'ended', chainRank: newRank, suppressionCount: suppressionCount + 1 };
    }
    return { chainType, chainState: 'active', chainRank: newRank, suppressionCount: suppressionCount + 1 };
  }

  if (chainState === 'notOpened') {
    if (!canOpenChain(chainType, play)) {
      return { chainType: 'none', chainState: 'broken', chainRank: null, suppressionCount: 0 };
    }
    const newRank = play.rank;
    if (chainType === 'hong8') {
      return { chainType, chainState: 'ended', chainRank: newRank, suppressionCount: 1 };
    }
    return { chainType, chainState: 'active', chainRank: newRank, suppressionCount: 1 };
  }

  return { chainType, chainState, chainRank, suppressionCount };
}

/** 确定领出后的链条状态 */
function determineChainAfterLead(play: Play, isLastCard: boolean): {
  chainType: ChainType; chainState: ChainState; chainRank: Rank | null;
} {
  if (play.isWenZun) return { chainType: 'wenZun', chainState: 'active', chainRank: 'A' };
  if (play.isWuZun) return { chainType: 'none', chainState: 'active', chainRank: null };
  if (play.isSiDaHe) return { chainType: 'siDaHe', chainState: 'active', chainRank: play.rank };

  // 单黑A：决胜轮开启铜锤链（待触发），非决胜轮普通
  if (play.cardCount === 1 && play.rank === 'A' && play.blackCount === 1) {
    return isLastCard
      ? { chainType: 'danA', chainState: 'notOpened', chainRank: null }
      : { chainType: 'none', chainState: 'active', chainRank: null };
  }

  // 红八决胜轮领出：开启丁三链（待触发）
  if (play.cardCount === 1 && play.rank === '8' && play.redCount === 1 && isLastCard) {
    return { chainType: 'hong8', chainState: 'notOpened', chainRank: null };
  }

  return { chainType: 'none', chainState: 'active', chainRank: null };
}

/** 处理领出 */
export function handleLeadPlay(state: GameState, cards: Card[]): GameState {
  const play = createPlay(cards);
  if (!play) return { ...state, message: '无效的出牌组合！' };

  const player = state.players[state.currentPlayerIndex];
  const handIds = new Set(player.hand.map(c => c.id));
  if (!cards.every(c => handIds.has(c.id))) return { ...state, message: '你没有这些牌！' };

  const trickPlay: TrickPlay = {
    playerIndex: state.currentPlayerIndex,
    cards,
    isFold: false,
    play,
  };

  const isLastCard = cards.length === player.hand.length;
  const chainInfo = determineChainAfterLead(play, isLastCard);
  const newHand = removeCards(player.hand, cards);
  const newPlayers = [...state.players];
  newPlayers[state.currentPlayerIndex] = { ...player, hand: newHand };

  return {
    ...state,
    players: newPlayers,
    phase: 'following',
    leadPlay: trickPlay,
    currentBestPlay: trickPlay,
    trickPlays: [trickPlay],
    chainType: chainInfo.chainType,
    chainState: chainInfo.chainState,
    chainRank: chainInfo.chainRank,
    suppressionCount: 0,
    isDecisiveRound: isLastCard,
    decisiveRoundWinner: isLastCard ? -1 : state.decisiveRoundWinner,
    currentPlayerIndex: (state.currentPlayerIndex + 3) % 4,
    wenZunAppeared: state.wenZunAppeared || play.isWenZun,
    playedCards: [...state.playedCards, ...cards],
    message: `${player.name}领出 ${describePlay(play)}`,
  };
}

/** 处理跟牌（压牌） */
export function handleFollowPlay(state: GameState, cards: Card[]): GameState {
  const player = state.players[state.currentPlayerIndex];
  const bestPlay = state.currentBestPlay;

  // 决胜轮零分锁死
  if (state.isDecisiveRound && player.score === 0) {
    return { ...state, message: '零分锁死！只能垫牌' };
  }

  const play = createPlay(cards);
  if (!play) return { ...state, message: '无效的出牌组合！' };

  const handIds = new Set(player.hand.map(c => c.id));
  if (!cards.every(c => handIds.has(c.id))) return { ...state, message: '你没有这些牌！' };
  if (!canBeat(play, bestPlay!.play!, state.chainType, state.chainState, state.chainRank)) {
    return { ...state, message: '无法压过当前最大牌！' };
  }

  const trickPlay: TrickPlay = {
    playerIndex: state.currentPlayerIndex,
    cards,
    isFold: false,
    play,
  };

  const chainInfo = updateChain(state.chainType, state.chainState, state.chainRank, state.suppressionCount, play);

  // 更新链开启计数
  let chainOpenCount = state.chainOpenCount;
  if (state.isDecisiveRound && state.chainState === 'notOpened' && chainInfo.chainState === 'active') {
    chainOpenCount = [...state.chainOpenCount];
    chainOpenCount[state.currentPlayerIndex] = (chainOpenCount[state.currentPlayerIndex] || 0) + 1;
  }

  const newHand = removeCards(player.hand, cards);
  const newPlayers = [...state.players];
  newPlayers[state.currentPlayerIndex] = { ...player, hand: newHand };

  const newTrickPlays = [...state.trickPlays, trickPlay];
  const newState: GameState = {
    ...state,
    players: newPlayers,
    currentBestPlay: trickPlay,
    trickPlays: newTrickPlays,
    chainType: chainInfo.chainType,
    chainState: chainInfo.chainState,
    chainRank: chainInfo.chainRank,
    suppressionCount: chainInfo.suppressionCount,
    currentPlayerIndex: (state.currentPlayerIndex + 3) % 4,
    playedCards: [...state.playedCards, ...cards],
    chainOpenCount,
    message: `${player.name}压出 ${describePlay(play)}`,
  };

  return newTrickPlays.length >= 4 ? resolveTrick(newState) : newState;
}

/** 处理垫牌 */
export function handleFold(state: GameState, selectedCards?: Card[]): GameState {
  const player = state.players[state.currentPlayerIndex];
  const leadCount = state.leadPlay!.cards.length;

  const context = buildGameContext(
    player.hand, state.playedCards, player.score,
    state.isDecisiveRound, state.wenZunAppeared,
  );

  let discardCards: Card[];
  if (selectedCards && selectedCards.length === leadCount) {
    const handIds = new Set(player.hand.map(c => c.id));
    discardCards = selectedCards.every(c => handIds.has(c.id))
      ? selectedCards
      : selectDiscardCards(player.hand, leadCount, state.isDecisiveRound, state.wenZunAppeared, context);
  } else {
    discardCards = selectDiscardCards(player.hand, leadCount, state.isDecisiveRound, state.wenZunAppeared, context);
  }

  const newHand = removeCards(player.hand, discardCards);
  const trickPlay: TrickPlay = {
    playerIndex: state.currentPlayerIndex,
    cards: discardCards,
    isFold: true,
    play: null,
  };

  const newPlayers = [...state.players];
  newPlayers[state.currentPlayerIndex] = { ...player, hand: newHand };

  const newTrickPlays = [...state.trickPlays, trickPlay];
  const newState: GameState = {
    ...state,
    players: newPlayers,
    trickPlays: newTrickPlays,
    currentPlayerIndex: (state.currentPlayerIndex + 3) % 4,
    message: `${player.name}垫牌`,
  };

  return newTrickPlays.length >= 4 ? resolveTrick(newState) : newState;
}

/** 结算一回合 */
export function resolveTrick(state: GameState): GameState {
  const winnerIndex = state.currentBestPlay!.playerIndex;
  const winnerTrickPlay = state.trickPlays.find(tp => tp.playerIndex === winnerIndex && !tp.isFold);
  const wonCards = winnerTrickPlay ? winnerTrickPlay.cards : [];
  const wonCardCount = wonCards.length;

  let bonusMsg = '';
  const bonusScores = [0, 0, 0, 0];
  const isGameOver = state.players.every(p => p.hand.length === 0);
  const dealerMultiplier = Math.pow(2, state.dealerStreak);

  // 非决胜轮即时结算尊钱/贺钱
  if (!isGameOver) {
    const chainMultiplier = Math.pow(2, state.suppressionCount);
    for (const tp of state.trickPlays) {
      if (tp.isFold || !tp.play) continue;

      // 尊钱（文至尊/武至尊）
      if (tp.play.isWenZun || tp.play.isWuZun) {
        const receiver = state.suppressionCount > 0 ? winnerIndex : tp.playerIndex;
        let totalReceived = 0;
        const baseAmount = tp.play.isWenZun && state.chainType === 'wenZun' && state.suppressionCount > 0
          ? 2 * chainMultiplier : 2;

        for (let i = 0; i < 4; i++) {
          if (i === receiver) continue;
          let amount = baseAmount;
          if (receiver === state.dealerIndex || i === state.dealerIndex) {
            amount = baseAmount * dealerMultiplier;
          }
          bonusScores[i] -= amount;
          totalReceived += amount;
        }
        bonusScores[receiver] += totalReceived;

        const chainNote = tp.play.isWenZun && state.suppressionCount > 0 ? `(×${chainMultiplier}链)` : '';
        bonusMsg += ` ${state.players[receiver].name}收尊钱+${totalReceived}${chainNote}`;
      }

      // 贺钱（四大贺）
      if (tp.play.isSiDaHe) {
        const receiver = state.suppressionCount > 0 ? winnerIndex : tp.playerIndex;
        let totalReceived = 0;
        const baseAmount = state.chainType === 'siDaHe' && state.suppressionCount > 0
          ? 4 * chainMultiplier : 4;

        for (let i = 0; i < 4; i++) {
          if (i === receiver) continue;
          let amount = baseAmount;
          if (receiver === state.dealerIndex || i === state.dealerIndex) {
            amount = baseAmount * dealerMultiplier;
          }
          bonusScores[i] -= amount;
          totalReceived += amount;
        }
        bonusScores[receiver] += totalReceived;

        const chainNote = state.suppressionCount > 0 ? `(×${chainMultiplier}链)` : '';
        bonusMsg += ` ${state.players[receiver].name}收贺钱+${totalReceived}${chainNote}`;
      }
    }
  }

  // 更新玩家分数和赢得的牌
  const updatedPlayers = state.players.map((p, i) => {
    const newScore = p.score + (i === winnerIndex ? wonCardCount : 0);
    const newWonCards = i === winnerIndex ? [...p.wonCards, ...wonCards] : p.wonCards;
    return { ...p, score: newScore, wonCards: newWonCards };
  });

  const newRoundBonusTotal = state.roundBonusTotal.map((v, i) => v + bonusScores[i]);
  const winnerScoreBefore = updatedPlayers[winnerIndex].score - wonCardCount;

  // 游戏结束（决胜轮）
  if (updatedPlayers.every(p => p.hand.length === 0)) {
    const bestPlay = state.currentBestPlay?.play;
    let specialNote = '';
    if (bestPlay) {
      if (bestPlay.isSiDaHe) specialNote = ' 四大贺×4倍率';
      else if (bestPlay.isWenZun) specialNote = ' 文至尊×2倍率';
      else if (bestPlay.isWuZun) specialNote = ' 武至尊×2倍率';
    }

    const newDecisiveParticipation = [...state.decisiveParticipation];
    for (let i = 0; i < 4; i++) {
      if (updatedPlayers[i].score >= 1) newDecisiveParticipation[i]++;
    }

    return {
      ...state,
      phase: 'game_over',
      players: updatedPlayers,
      decisiveRoundWinner: winnerIndex,
      lastTrickWinnerIndex: winnerIndex,
      winnerScoreBeforeDecisive: winnerScoreBefore,
      lastTrickBonus: bonusScores,
      roundBonusTotal: newRoundBonusTotal,
      totalDecisiveRounds: state.totalDecisiveRounds + 1,
      decisiveParticipation: newDecisiveParticipation,
      message: `决胜轮结束！${updatedPlayers[winnerIndex].name}赢得最终胜利！${specialNote}`,
    };
  }

  // 回合结束
  return {
    ...state,
    phase: 'trick_end',
    players: updatedPlayers,
    lastTrickWinnerIndex: winnerIndex,
    lastTrickBonus: bonusScores,
    roundBonusTotal: newRoundBonusTotal,
    message: `${updatedPlayers[winnerIndex].name}赢得本回合（+${wonCardCount}张分牌）${bonusMsg}`,
  };
}

// ========== 决胜轮结算 ==========

/** 计算决胜轮得分明细 */
export function calculateDecisiveScores(state: GameState): DecisiveScoreDetail[] {
  const winner = state.decisiveRoundWinner;
  const isDealerWinner = winner === state.dealerIndex;
  const isLeadWinner = state.leadPlay?.playerIndex === winner;
  const dealerMult = Math.pow(2, state.dealerStreak);

  // 链参与者
  const chainParticipants = new Set<number>();
  const hasActiveChain = state.chainType !== 'none' && state.chainState !== 'broken' && state.suppressionCount > 0;
  if (hasActiveChain) {
    for (const tp of state.trickPlays) {
      if (!tp.isFold) chainParticipants.add(tp.playerIndex);
    }
  }

  const isSingleSuppression = hasActiveChain && state.suppressionCount === 1;

  const bestPlay = state.currentBestPlay?.play;
  const leadPlay = state.leadPlay?.play;

  // 基础决胜倍率
  let decisiveBase = 1;
  if (hasActiveChain) {
    switch (state.chainType) {
      case 'wenZun': case 'danA': case 'hong8': decisiveBase = 2; break;
      case 'siDaHe': decisiveBase = 4; break;
      default: decisiveBase = 1;
    }
  } else if (bestPlay) {
    if (bestPlay.isSiDaHe) decisiveBase = 4;
    else if (bestPlay.isWenZun || bestPlay.isWuZun || (bestPlay.cardCount === 1 && bestPlay.rank === 'A' && bestPlay.blackCount === 1)) decisiveBase = 2;
    else if (bestPlay.cardCount === 1 && bestPlay.rank === '8' && bestPlay.redCount === 1) decisiveBase = 2;
  }

  const leadPlayerIndex = state.leadPlay?.playerIndex ?? -1;
  const results: DecisiveScoreDetail[] = [];

  for (let i = 0; i < 4; i++) {
    if (i === winner) continue;

    const playerScore = state.players[i].score;
    const isHighScore = playerScore >= 4;
    const baseScore = playerScore === 0 ? 5 : 4 - playerScore;

    // 统杀系数
    let tongShaCoeff = 1;
    const allOthersZero = state.players.every((p, idx) => idx === winner || p.score === 0);
    if (isLeadWinner && allOthersZero) {
      const leadOrBest = leadPlay ?? bestPlay;
      if (leadOrBest) {
        if (leadOrBest.rank === 'K' || leadOrBest.isWuZun) tongShaCoeff = 8;
        else {
          const ws = state.winnerScoreBeforeDecisive;
          if (ws >= 7) tongShaCoeff = 4;
          else if (ws >= 6) tongShaCoeff = 2;
          else if (ws >= 5) tongShaCoeff = 1.6;
          else if (ws >= 4) tongShaCoeff = 1.2;
        }
      }
    }

    // 庄家倍率
    let dealerMultForPlayer = 1;
    if (isDealerWinner || i === state.dealerIndex) {
      dealerMultForPlayer = dealerMult;
    }

    // 决胜倍率
    const decisiveMult = hasActiveChain && chainParticipants.has(i)
      ? decisiveBase * Math.pow(2, state.suppressionCount)
      : decisiveBase;

    let totalScore: number;
    // 包赔逻辑
    if (isSingleSuppression && i === leadPlayerIndex) {
      let baoPeiAmount = Math.round(baseScore * tongShaCoeff * (decisiveBase * Math.pow(2, state.suppressionCount)) * dealerMultForPlayer);
      for (let j = 0; j < 4; j++) {
        if (j === winner || j === leadPlayerIndex || state.players[j].score >= 4) continue;
        const otherBase = state.players[j].score === 0 ? 5 : 4 - state.players[j].score;
        let otherDealerMult = 1;
        if (isDealerWinner || j === state.dealerIndex) otherDealerMult = dealerMult;
        baoPeiAmount += Math.round(otherBase * tongShaCoeff * decisiveBase * otherDealerMult);
      }
      totalScore = baoPeiAmount;
    } else if (isSingleSuppression && i !== leadPlayerIndex && !isHighScore) {
      totalScore = 0;
    } else {
      totalScore = Math.round(baseScore * tongShaCoeff * decisiveMult * dealerMultForPlayer);
    }

    results.push({
      playerId: i,
      baseScore,
      tongShaCoeff,
      decisiveMultiplier: decisiveMult,
      dealerMultiplier: dealerMultForPlayer,
      totalScore,
      isChainParticipant: chainParticipants.has(i),
      isBaoPeiPayer: isSingleSuppression && i === leadPlayerIndex,
    });
  }

  return results;
}

/** 计算决胜轮各玩家总分 */
export function calculateDecisiveTotalScores(
  details: DecisiveScoreDetail[],
  winnerIndex: number,
): number[] {
  const scores = [0, 0, 0, 0];
  for (const d of details) {
    scores[winnerIndex] += d.totalScore;
    scores[d.playerId] -= d.totalScore;
  }
  return scores;
}

// ========== 工具函数 ==========

/** 描述出牌类型 */
export function describePlay(play: Play): string {
  if (play.isWenZun) return '文至尊(对A)';
  if (play.isWuZun) return '武至尊(10+8)';
  if (play.isSiDaHe) return `四大贺(${play.rank})`;
  if (play.cardCount === 1) return `${SUIT_SYMBOLS[play.cards[0].suit]}${RANK_DISPLAY[play.cards[0].rank]}`;
  if (play.blackCount > 0 && play.redCount > 0) return `${play.rank}混色(${play.blackCount}黑${play.redCount}红)`;
  if (play.blackCount > 0) return `黑${play.rank}对`;
  return `红${play.rank}对`;
}

/** 获取链类型中文名 */
export function getChainTypeName(chainType: ChainType): string {
  switch (chainType) {
    case 'wenZun': return '文尊链';
    case 'siDaHe': return '贺链';
    case 'danA': return '铜锤链';
    case 'hong8': return '丁三链';
    default: return '';
  }
}

/** 验证出牌 */
export function validatePlay(
  cards: Card[],
  phase: Phase,
  bestPlay: Play | null,
  chainType: ChainType,
  chainState: ChainState,
  chainRank: Rank | null,
): PlayValidation {
  if (phase === 'leading') {
    if (cards.length === 0) return { valid: false, play: null, error: '请选择至少1张牌' };
    if (cards.length > 4) return { valid: false, play: null, error: '最多出4张牌' };
    const play = createPlay(cards);
    if (play) return { valid: true, play, error: '' };
    return { valid: false, play: null, error: '无效牌型（必须是同点同色对/混色/至尊）' };
  }

  if (phase === 'following' && bestPlay) {
    const play = createPlay(cards);
    if (!play) return { valid: false, play: null, error: '无效牌型' };
    if (play.cardCount !== bestPlay.cardCount) return { valid: false, play: null, error: `需要出${bestPlay.cardCount}张牌` };
    if (play.blackCount !== bestPlay.blackCount || play.redCount !== bestPlay.redCount) {
      return { valid: false, play: null, error: `需要${bestPlay.blackCount}黑${bestPlay.redCount}红` };
    }
    if (canBeat(play, bestPlay, chainType, chainState, chainRank)) {
      return { valid: true, play, error: '' };
    }
    return { valid: false, play: null, error: '无法压过当前最大牌' };
  }

  return { valid: false, play: null, error: '' };
}

/** 计算下一局的庄家信息（庄家例牌时继续累乘倍率，非庄家例牌时转移庄家并重置倍率） */
export function calculateNextDealer(state: GameState): { dealerIndex: number; dealerStreak: number } {
  const winner = state.decisiveRoundWinner;

  // 例牌：转移庄家给例牌胜者
  if (state.lipaiResult) {
    // 庄家自己例牌：下局继续本局倍率×2（streak+1，即2^streak翻倍）
    if (state.lipaiResult.playerIndex === state.dealerIndex) {
      return { dealerIndex: state.dealerIndex, dealerStreak: state.dealerStreak + 1 };
    }
    // 非庄家例牌：庄家转移，倍率重置为2倍（streak=1）
    return { dealerIndex: state.lipaiResult.playerIndex, dealerStreak: 1 };
  }

  // 正常局：庄家赢则继续坐庄，倍率累加
  if (winner === state.dealerIndex) {
    return { dealerIndex: state.dealerIndex, dealerStreak: state.dealerStreak + 1 };
  }

  return { dealerIndex: winner, dealerStreak: 1 };
}
