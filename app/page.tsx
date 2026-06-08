'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  type Card, type ChainType, type GameState,
  type LipaiResult, type DecisiveScoreDetail,
  SUIT_SYMBOLS, RANK_DISPLAY,
  createInitialState, startRound,
  buildGameContext, aiSelectLeadCards, aiSelectFollowCards,
  handleLeadPlay, handleFollowPlay, handleFold,
  canPlayCards, validatePlay, calculateDecisiveScores,
  calculateDecisiveTotalScores, getChainTypeName,
  calculateNextDealer,
} from '@/lib/game';

// ========== 子组件 ==========

/** 分牌数量徽章 */
const ScoreBadge = memo(function ScoreBadge({ count }: { count: number }) {
  return count === 0
    ? (
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-gray-500/30 text-gray-400">
        0
      </div>
    )
    : (
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-green-500 text-white shadow-[0_0_6px_rgba(74,222,128,0.8)]">
        {count}
      </div>
    );
});

/** 玩家名标签 */
const PlayerLabel = memo(function PlayerLabel({
  name, score, isActive, isVertical,
}: {
  name: string; score: number; isActive: boolean; isVertical: boolean;
}) {
  const chars = name.split('');
  return (
    <div
      className={`px-2 py-0.5 rounded-lg text-center shrink-0
        ${isActive ? 'bg-amber-100 border-2 border-amber-400' : 'bg-white/70 border border-gray-200'}`}
      style={score >= 1 ? { outline: '2px solid #4ade80', outlineOffset: '3px' } : undefined}
    >
      {isVertical && chars.length > 1 ? (
        <div className="flex flex-col items-center leading-tight">
          {chars.map((ch, i) => (
            <span key={i} className="font-bold text-sm text-gray-800">{ch}</span>
          ))}
        </div>
      ) : (
        <span className="font-bold text-sm text-gray-800">{name}</span>
      )}
    </div>
  );
});

/** 庄家徽章 */
const DealerBadge = memo(function DealerBadge() {
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-red-500 text-white shadow-[0_0_6px_rgba(239,68,68,0.6)]">
      庄
    </div>
  );
});

/** 单张牌显示 */
const CardDisplay = memo(function CardDisplay({ card }: { card: Card }) {
  const isRed = card.color === 'red';
  return (
    <div className={`w-8 h-11 rounded text-[10px] flex flex-col items-center justify-center font-bold border shadow-sm
      ${isRed ? 'border-red-300 bg-white text-red-600' : 'border-gray-300 bg-white text-gray-800'}`}>
      <span className="leading-none">{SUIT_SYMBOLS[card.suit]}</span>
      <span className="leading-none font-black">{RANK_DISPLAY[card.rank]}</span>
    </div>
  );
});

/** 回合出牌展示 */
const TrickPlayDisplay = memo(function TrickPlayDisplay({ trickPlay }: { trickPlay: { cards: Card[]; isFold: boolean } | null }) {
  if (!trickPlay) return null;
  if (trickPlay.isFold) {
    return (
      <div className="flex gap-0.5">
        {trickPlay.cards.map((_, i) => (
          <div key={i} className="w-8 h-11 rounded border shadow-sm bg-amber-400 border-amber-500 flex items-center justify-center">
            <div className="w-5 h-8 rounded border border-amber-600/50 bg-amber-300/60 flex items-center justify-center">
              <div className="w-3 h-5 rounded-sm border border-amber-600/30 bg-amber-500/40" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-0.5">
      {trickPlay.cards.map((card, i) => (
        <CardDisplay key={i} card={card} />
      ))}
    </div>
  );
});

/** 决胜轮结算面板 */
const ScoreSettlement = memo(function ScoreSettlement({
  scores, players, winnerIndex, deltas, roundBonusTotal, chainType, suppressionCount,
}: {
  scores: DecisiveScoreDetail[];
  players: { name: string; score: number }[];
  winnerIndex: number;
  cumulativeScores: number[];
  deltas: number[];
  roundBonusTotal: number[];
  chainType: ChainType;
  suppressionCount: number;
}) {
  const hasChain = chainType !== 'none' && suppressionCount > 0;
  const isSingleSup = hasChain && suppressionCount === 1;
  const isMultiSup = hasChain && suppressionCount >= 2;

  return (
    <div className="bg-white/95 rounded-xl p-4 w-full max-w-md shadow-xl">
      <h3 className="text-lg font-bold text-center mb-2">本局结算</h3>
      <div className="text-center mb-3">
        <span className="text-amber-700 font-bold text-xl">{players[winnerIndex].name}</span> 赢得本局！
      </div>
      <div className="flex justify-center gap-3 mb-2 text-xs text-gray-500">
        {players.map((p, i) => (
          <span key={i}>{p.name}: {p.score}张分牌</span>
        ))}
      </div>
      {hasChain && (
        <div className="text-center mb-2">
          <span className="text-sm font-bold text-red-600">
            {getChainTypeName(chainType)} · 压制{suppressionCount}次{isSingleSup && ' · 包赔'}{isMultiSup && ` · ${Math.pow(2, suppressionCount)}倍率`}
          </span>
        </div>
      )}
      <div className="space-y-2">
        {scores.map(s => (
          <div key={s.playerId} className="flex justify-between items-center text-sm border-b border-gray-100 pb-1.5">
            <span className="font-semibold w-16">{players[s.playerId].name}</span>
            <div className="flex gap-1 text-[10px] text-gray-400">
              <span>{s.baseScore}</span>
              <span>×{s.tongShaCoeff}</span>
              <span>×{s.decisiveMultiplier}</span>
              <span>×{s.dealerMultiplier}</span>
              {s.isBaoPeiPayer && <span className="text-red-500 ml-1">包赔</span>}
              {s.isChainParticipant && !s.isBaoPeiPayer && <span className="text-blue-500 ml-1">翻番</span>}
            </div>
            <span className={`font-bold min-w-[60px] text-right ${s.totalScore > 0 ? 'text-red-600' : s.totalScore < 0 ? 'text-green-600' : 'text-gray-500'}`}>
              {s.totalScore > 0 ? `-${s.totalScore}` : s.totalScore < 0 ? `+${Math.abs(s.totalScore)}` : '±0'}分
            </span>
          </div>
        ))}
      </div>
      {roundBonusTotal.some(v => v !== 0) && (
        <div className="mt-2 pt-2 border-t border-amber-200">
          <div className="text-xs text-amber-700 font-semibold text-center mb-1">尊钱/贺钱（已即时结算）</div>
          <div className="flex justify-center gap-3">
            {players.map((p, i) => (
              <span key={i} className={`text-sm font-bold ${roundBonusTotal[i] > 0 ? 'text-green-600' : roundBonusTotal[i] < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {p.name}: {roundBonusTotal[i] > 0 ? '+' : ''}{roundBonusTotal[i]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/** 例牌动画 */
function LipaiAnimation({ lipaiResult, playerName }: { lipaiResult: LipaiResult; playerName: string }) {
  const level = lipaiResult.lipai.animationLevel;
  if (level === 0) return null;
  if (level === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 pointer-events-none">
        <div className="bg-amber-500 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce font-bold text-lg">
          {playerName}【{lipaiResult.lipai.name}】{lipaiResult.lipai.multiplier}分
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ backgroundColor: level === 3 ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' }}>
      <div className={`flex flex-col items-center gap-3 ${level === 3 ? 'animate-pulse' : ''}`}>
        <div className="text-4xl font-black text-amber-400 drop-shadow-lg" style={{ textShadow: '0 0 20px rgba(251,191,36,0.8)' }}>
          例牌天胡！
        </div>
        <div className="text-2xl font-bold text-white">{playerName}</div>
        <div className="bg-red-600 text-white px-6 py-2 rounded-xl text-xl font-black shadow-xl" style={{ boxShadow: '0 0 30px rgba(220,38,38,0.6)' }}>
          【{lipaiResult.lipai.name}】
        </div>
        <div className="text-3xl font-black text-amber-300" style={{ textShadow: '0 0 15px rgba(251,191,36,0.6)' }}>
          {lipaiResult.lipai.multiplier}分
        </div>
      </div>
    </div>
  );
}

/** 例牌手牌展示（整合版：标题+玩家名+手牌+分数，纵向排列不遮挡） */
function LipaiHandDisplay({ players, lipaiWinnerIndex, dealerIndex, lipaiResult }: {
  players: { hand: Card[]; name: string }[];
  lipaiWinnerIndex: number;
  dealerIndex: number;
  lipaiResult: LipaiResult;
}) {
  const winner = players[lipaiWinnerIndex];
  if (!winner) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 py-4">
      {/* 顶部：例牌天胡标题 */}
      <span className="bg-red-600 text-white px-4 py-1 rounded-lg text-base font-black animate-pulse shadow-lg">
        例牌天胡！
      </span>

      {/* 玩家名 */}
      <div className="bg-white/90 px-3 py-0.5 rounded-lg text-sm font-black text-gray-800 shadow">
        {winner.name} 🏆
        {lipaiWinnerIndex === dealerIndex && (
          <span className="text-[10px] bg-red-600 text-white px-1 rounded ml-1">庄</span>
        )}
      </div>

      {/* 手牌 */}
      <div className="flex gap-1 bg-black/30 p-2 rounded-xl">
        {winner.hand.map((card, i) => (
          <div
            key={i}
            className="w-10 h-14 rounded border-2 flex flex-col items-center justify-center font-bold shadow-md border-yellow-400 bg-white"
          >
            <span className={`text-sm leading-none ${card.color === 'red' ? 'text-red-600' : 'text-gray-800'}`}>
              {SUIT_SYMBOLS[card.suit]}
            </span>
            <span className={`text-xs leading-none font-black ${card.color === 'red' ? 'text-red-600' : 'text-gray-800'}`}>
              {RANK_DISPLAY[card.rank]}
            </span>
          </div>
        ))}
      </div>

      {/* 底部：牌型名称+分数 */}
      <div className="bg-red-700 text-white px-4 py-1.5 rounded-lg font-bold shadow-md">
        【{lipaiResult.lipai.name}】{lipaiResult.lipai.multiplier}分
      </div>
    </div>
  );
}

/** 例牌结算面板 */
function LipaiSettlement({ lipaiResult, players }: {
  lipaiResult: LipaiResult;
  players: { name: string }[];
}) {
  const wi = lipaiResult.playerIndex;
  return (
    <div className="bg-white/95 rounded-xl p-4 w-full max-w-md shadow-xl mt-2">
      <h3 className="text-lg font-bold text-center mb-1">例牌天胡结算</h3>
      <div className="text-center mb-2">
        <span className="text-red-600 font-black text-xl">{players[wi].name}</span>
        <span className="ml-2 text-amber-700 font-bold">
          【{lipaiResult.lipai.name}】{lipaiResult.lipai.multiplier}分
        </span>
      </div>
      <div className="space-y-2">
        {players.map((p, i) => (
          <div key={i} className={`flex justify-between items-center text-sm border-b border-gray-100 pb-1.5 ${i === wi ? 'font-bold' : ''}`}>
            <span className={`w-16 ${i === wi ? 'text-red-600' : ''}`}>
              {p.name}{i === wi ? ' 🏆' : ''}
            </span>
            <span className={`font-bold min-w-[80px] text-right ${lipaiResult.scores[i] > 0 ? 'text-green-600' : lipaiResult.scores[i] < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {lipaiResult.scores[i] > 0 ? '+' : ''}{lipaiResult.scores[i]}分
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}



/** 玩家区域（独立组件，避免在主组件内定义） */
const PlayerArea = memo(function PlayerArea({
  playerIndex, name, score, isActive, isDealer, trickPlay,
}: {
  playerIndex: number;
  name: string;
  score: number;
  isActive: boolean;
  isDealer: boolean;
  trickPlay: { cards: Card[]; isFold: boolean } | null;
}) {
  const scorePos: Record<number, 'left' | 'right' | 'top' | 'bottom'> = { 0: 'left', 1: 'top', 2: 'right', 3: 'bottom' };
  const dealerPos: Record<number, 'left' | 'right' | 'top' | 'bottom'> = { 0: 'right', 1: 'bottom', 2: 'left', 3: 'top' };
  const trickPos: Record<number, 'above' | 'below' | 'left' | 'right'> = { 0: 'above', 1: 'right', 2: 'below', 3: 'left' };

  const sp = scorePos[playerIndex];
  const dp = dealerPos[playerIndex];
  const tp = trickPos[playerIndex];

  const label = (
    <div className="relative">
      <PlayerLabel name={name} score={score} isActive={isActive} isVertical={playerIndex === 1 || playerIndex === 3} />
      {sp === 'left' && <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2"><ScoreBadge count={score} /></div>}
      {sp === 'right' && <div className="absolute left-full ml-1 top-1/2 -translate-y-1/2"><ScoreBadge count={score} /></div>}
      {sp === 'top' && <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2"><ScoreBadge count={score} /></div>}
      {sp === 'bottom' && <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2"><ScoreBadge count={score} /></div>}
      {isDealer && dp === 'left' && <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2"><DealerBadge /></div>}
      {isDealer && dp === 'right' && <div className="absolute left-full ml-1 top-1/2 -translate-y-1/2"><DealerBadge /></div>}
      {isDealer && dp === 'top' && <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2"><DealerBadge /></div>}
      {isDealer && dp === 'bottom' && <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2"><DealerBadge /></div>}
    </div>
  );

  const trickDisplay = <TrickPlayDisplay trickPlay={trickPlay} />;

  if (tp === 'above') return <div className="flex flex-col items-center gap-0.5">{trickDisplay}{label}</div>;
  if (tp === 'below') return <div className="flex flex-col items-center gap-0.5">{label}{trickDisplay}</div>;
  if (tp === 'left') return <div className="flex items-center gap-1">{trickDisplay}{label}</div>;
  return <div className="flex items-center gap-1">{label}{trickDisplay}</div>;
});

// ========== 主游戏组件 ==========

export default function GameApp() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set);

  const [showLipaiAnim, setShowLipaiAnim] = useState(false);
  const [cumScores, setCumScores] = useState<number[]>([0, 0, 0, 0]);

  const trickEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef<Set<string>>(new Set());
  const lipaiAnimPhaseRef = useRef<number>(-1);

  // 保持ref同步
  useEffect(() => { selectedRef.current = selectedIds; }, [selectedIds]);

  // 清理定时器
  useEffect(() => () => {
    if (trickEndTimer.current) clearTimeout(trickEndTimer.current);
    if (aiTimer.current) clearTimeout(aiTimer.current);
  }, []);

  // 例牌动画处理（用ref追踪当前动画阶段，避免重复触发）
  useEffect(() => {
    if (state.phase !== 'lipai' || !state.lipaiResult) {
      lipaiAnimPhaseRef.current = -1;
      return;
    }
    const roundNum = state.roundNumber;
    if (lipaiAnimPhaseRef.current === roundNum) return; // 已处理
    lipaiAnimPhaseRef.current = roundNum;

    const level = state.lipaiResult.lipai.animationLevel;
    const delay = level === 0 ? 500 : level === 1 ? 1500 : level === 2 ? 2500 : 3500;

    // 记录例牌分数到累计
    const lipaiScores = state.lipaiResult.scores;
    // 使用 queueMicrotask 避免在 effect 中同步调用 setState
    queueMicrotask(() => {
      setCumScores(prev => prev.map((v, i) => v + lipaiScores[i]));
      setShowLipaiAnim(true);
    });

    const timer = setTimeout(() => {
      setShowLipaiAnim(false);
      setState(s => ({
        ...s,
        phase: 'game_over',
        decisiveRoundWinner: s.lipaiResult!.playerIndex,
        message: `例牌天胡！${s.players[s.lipaiResult!.playerIndex].name}【${s.lipaiResult!.lipai.name}】${s.lipaiResult!.lipai.multiplier}分`,
      }));
    }, delay);
    return () => clearTimeout(timer);
  }, [state.phase, state.lipaiResult, state.roundNumber]);

  // AI 自动出牌
  useEffect(() => {
    if ((state.phase === 'leading' || state.phase === 'following') && !state.players[state.currentPlayerIndex].isHuman) {
      aiTimer.current = setTimeout(() => {
        setState(s => {
          const player = s.players[s.currentPlayerIndex];
          if (player.isHuman) return s;

          if (s.phase === 'leading') {
            const allScores = s.players.map(p => p.score);
            const ctx = buildGameContext(
              player.hand, s.playedCards, player.score,
              s.isDecisiveRound, s.wenZunAppeared,
              allScores, s.chainOpenCount, s.totalDecisiveRounds,
              s.decisiveParticipation, s.currentPlayerIndex,
            );
            const cards = aiSelectLeadCards(player.hand, s.isDecisiveRound, s.wenZunAppeared, ctx);
            return handleLeadPlay(s, cards);
          }

          if (s.phase === 'following' && s.currentBestPlay?.play) {
            const allScores = s.players.map(p => p.score);
            const ctx = buildGameContext(
              player.hand, s.playedCards, player.score,
              s.isDecisiveRound, s.wenZunAppeared,
              allScores, s.chainOpenCount, s.totalDecisiveRounds,
              s.decisiveParticipation, s.currentPlayerIndex,
            );
            const result = aiSelectFollowCards(
              player.hand, s.currentBestPlay.play,
              s.chainType, s.chainState, s.chainRank,
              player.score, s.isDecisiveRound, s.wenZunAppeared, ctx,
            );
            return result.fold
              ? handleFold(s, result.cards.length > 0 ? result.cards : undefined)
              : handleFollowPlay(s, result.cards);
          }

          return s;
        });
        setSelectedIds(new Set());
        selectedRef.current = new Set();
      }, 200);
      return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
    }
  }, [state.phase, state.currentPlayerIndex]);

  // 回合结束过渡
  useEffect(() => {
    if (state.phase === 'trick_end') {
      // 尊钱/贺钱累计
      if (state.lastTrickBonus.some(v => v !== 0)) {
        const bonus = state.lastTrickBonus;
        queueMicrotask(() => {
          setCumScores(prev => prev.map((v, i) => v + bonus[i]));
        });
      }

      trickEndTimer.current = setTimeout(() => {
        setState(s => {
          const winner = s.lastTrickWinnerIndex;
          return {
            ...s,
            phase: 'leading',
            currentPlayerIndex: winner,
            trickNumber: s.trickNumber + 1,
            leadPlay: null,
            currentBestPlay: null,
            trickPlays: [],
            chainType: 'none',
            chainState: 'notOpened',
            chainRank: null,
            suppressionCount: 0,
            isDecisiveRound: false,
            lastTrickBonus: [0, 0, 0, 0],
            message: `${s.players[winner].name}领出`,
          };
        });
        setSelectedIds(new Set());
        selectedRef.current = new Set();
      }, 800);
      return () => { if (trickEndTimer.current) clearTimeout(trickEndTimer.current); };
    }
  }, [state.phase, state.lastTrickBonus]);

  // 游戏结束决胜分计算
  useEffect(() => {
    if (state.phase !== 'game_over' || state.lipaiResult) return;
    const deltas = calculateDecisiveTotalScores(calculateDecisiveScores(state), state.decisiveRoundWinner);
    queueMicrotask(() => {
      setCumScores(prev => prev.map((v, i) => v + deltas[i]));
    });
  }, [state.phase, state.decisiveRoundWinner]);

  // 人类玩家只剩1张牌时自动领出
  useEffect(() => {
    if (state.phase !== 'leading' || state.currentPlayerIndex !== 0 || state.players[0].hand.length !== 1) return;
    const timer = setTimeout(() => {
      setState(s => {
        if (s.phase !== 'leading' || s.currentPlayerIndex !== 0 || s.players[0].hand.length !== 1) return s;
        return handleLeadPlay(s, [s.players[0].hand[0]]);
      });
      setSelectedIds(new Set());
      selectedRef.current = new Set();
    }, 300);
    return () => clearTimeout(timer);
  }, [state.phase, state.currentPlayerIndex, state.players[0].hand.length]);

  // 决胜轮人类零分自动垫牌
  useEffect(() => {
    if (state.phase !== 'following' || state.currentPlayerIndex !== 0 || !state.isDecisiveRound || !state.currentBestPlay?.play) return;
    const human = state.players[0];
    if (canPlayCards(human.hand, state.currentBestPlay.play, state.chainType, state.chainState, state.chainRank, human.score, state.isDecisiveRound)) return;
    const timer = setTimeout(() => {
      setState(s => {
        if (s.phase !== 'following' || s.currentPlayerIndex !== 0) return s;
        const p = s.players[0];
        if (canPlayCards(p.hand, s.currentBestPlay!.play!, s.chainType, s.chainState, s.chainRank, p.score, s.isDecisiveRound)) return s;
        return handleFold(s);
      });
      setSelectedIds(new Set());
      selectedRef.current = new Set();
    }, 300);
    return () => clearTimeout(timer);
  }, [state.phase, state.currentPlayerIndex, state.isDecisiveRound, state.players[0].score, state.currentBestPlay, state.chainType, state.chainState, state.chainRank]);

  // 计算派生状态
  const humanPlayer = state.players[0];
  const isHumanTurn = useMemo(
    () => humanPlayer.isHuman && state.players[state.currentPlayerIndex]?.isHuman && (state.phase === 'leading' || state.phase === 'following'),
    [humanPlayer.isHuman, state.players, state.currentPlayerIndex, state.phase],
  );
  const isZeroScoreLocked = useMemo(
    () => state.isDecisiveRound && state.currentPlayerIndex === 0 && humanPlayer.score === 0 && state.phase === 'following',
    [state.isDecisiveRound, state.currentPlayerIndex, humanPlayer.score, state.phase],
  );
  const canBeatCurrent = useMemo(
    () => state.phase === 'following' && state.currentPlayerIndex === 0 && !!state.currentBestPlay?.play
      && canPlayCards(humanPlayer.hand, state.currentBestPlay.play, state.chainType, state.chainState, state.chainRank, humanPlayer.score, state.isDecisiveRound),
    [state.phase, state.currentPlayerIndex, state.currentBestPlay, state.chainType, state.chainState, state.chainRank, humanPlayer.hand, humanPlayer.score, state.isDecisiveRound],
  );

  const leadPlay = state.leadPlay?.play;
  const leadCardCount = leadPlay?.cardCount ?? 0;
  const leadBlackCount = leadPlay?.blackCount ?? 0;
  const leadRedCount = leadPlay?.redCount ?? 0;

  const decisiveDetails = state.phase === 'game_over' ? calculateDecisiveScores(state) : null;

  const decisiveDeltas = state.phase === 'game_over' && !state.lipaiResult && decisiveDetails
    ? calculateDecisiveTotalScores(decisiveDetails, state.decisiveRoundWinner)
    : null;

  // 例牌展示模式：lipai阶段 或 game_over阶段有lipaiResult时，持续显示例牌手牌
  const isLipaiDisplay = state.phase === 'lipai' || (state.phase === 'game_over' && !!state.lipaiResult);

  const dealerMultiplier = useMemo(
    () => state.dealerStreak <= 1 ? 2 : Math.pow(2, state.dealerStreak),
    [state.dealerStreak],
  );

  // 操作回调
  const toggleCard = useCallback((cardId: string) => {
    if (state.phase !== 'leading' && state.phase !== 'following') return;
    if (!state.players[state.currentPlayerIndex].isHuman) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      selectedRef.current = next;
      return next;
    });
  }, [state.phase, state.currentPlayerIndex, state.players]);

  const confirmPlay = useCallback(() => {
    const sel = selectedRef.current;
    setState(s => {
      if (!s.players[s.currentPlayerIndex].isHuman) return s;
      const selectedCards = s.players[s.currentPlayerIndex].hand.filter(c => sel.has(c.id));
      if (selectedCards.length === 0) return s;

      if (s.phase === 'leading') {
        const result = validatePlay(selectedCards, 'leading', null, s.chainType, s.chainState, s.chainRank);
        return result.valid ? handleLeadPlay(s, selectedCards) : { ...s, message: result.error };
      }

      if (s.phase === 'following' && s.currentBestPlay?.play) {
        const result = validatePlay(selectedCards, 'following', s.currentBestPlay.play, s.chainType, s.chainState, s.chainRank);
        return result.valid ? handleFollowPlay(s, selectedCards) : { ...s, message: result.error };
      }

      return s;
    });
    setSelectedIds(new Set());
    selectedRef.current = new Set();
  }, []);

  const confirmFold = useCallback(() => {
    const sel = selectedRef.current;
    setState(s => {
      if (!s.players[s.currentPlayerIndex].isHuman || s.phase !== 'following') return s;
      const selectedCards = s.players[s.currentPlayerIndex].hand.filter(c => sel.has(c.id));
      return handleFold(s, selectedCards.length > 0 ? selectedCards : undefined);
    });
    setSelectedIds(new Set());
    selectedRef.current = new Set();
  }, []);

  const startGame = useCallback(() => {
    setState(s => startRound(s));
    setSelectedIds(new Set());
    selectedRef.current = new Set();
  }, []);

  const nextRound = useCallback(() => {
    const { dealerIndex, dealerStreak } = calculateNextDealer(state);
    const fresh = createInitialState();
    setState(startRound({
      ...fresh,
      dealerIndex,
      dealerStreak,
      roundNumber: state.roundNumber + 1,
      players: fresh.players.map((p, i) => ({
        ...p,
        name: state.players[i].name,
        isHuman: state.players[i].isHuman,
      })),
      cumulativeScores: cumScores,
      chainOpenCount: state.chainOpenCount,
      totalDecisiveRounds: state.totalDecisiveRounds,
      decisiveParticipation: state.decisiveParticipation,
    }));
    setSelectedIds(new Set());
    selectedRef.current = new Set();
    setShowLipaiAnim(false);
  }, [state, cumScores]);

  const resetAll = useCallback(() => {
    setState(createInitialState());
    setCumScores([0, 0, 0, 0]);
    setSelectedIds(new Set());
    selectedRef.current = new Set();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-900 flex flex-col items-center pt-2 pb-2 select-none">
      {/* 顶部信息栏 */}
      <div className="mb-2 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 flex gap-4 items-center justify-center">
            <span className="text-[11px] text-green-300 font-semibold">总积分</span>
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-3">
                {state.players.slice(0, 2).map((p, i) => (
                  <div key={i} className="text-center">
                    <span className="text-[11px] text-green-200">{p.name}</span>
                    <span className={`ml-1 text-sm font-bold ${cumScores[i] > 0 ? 'text-green-400' : cumScores[i] < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {cumScores[i] > 0 ? '+' : ''}{cumScores[i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                {state.players.slice(2, 4).map((p, i) => (
                  <div key={i + 2} className="text-center">
                    <span className="text-[11px] text-green-200">{p.name}</span>
                    <span className={`ml-1 text-sm font-bold ${cumScores[i + 2] > 0 ? 'text-green-400' : cumScores[i + 2] < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {cumScores[i + 2] > 0 ? '+' : ''}{cumScores[i + 2]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={resetAll} className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-[10px] font-bold rounded-lg shadow transition-all whitespace-nowrap">
            重置总积分
          </button>
        </div>
        <p className="text-base font-bold text-green-300">
          第{state.roundNumber}局 · 庄家倍率{dealerMultiplier}x · 第{state.trickNumber}回合
        </p>
      </div>

      {/* 例牌动画 */}
      {state.phase === 'lipai' && state.lipaiResult && showLipaiAnim && (
        <LipaiAnimation lipaiResult={state.lipaiResult} playerName={state.players[state.lipaiResult.playerIndex].name} />
      )}

      {/* 牌桌区域 */}
      <div className="relative w-full max-w-[640px] aspect-[4/3] bg-gradient-to-br from-green-700 via-green-650 to-green-600 rounded-2xl border-4 border-amber-800 shadow-2xl overflow-hidden">
        {isLipaiDisplay && state.lipaiResult ? (
          <LipaiHandDisplay players={state.players} lipaiWinnerIndex={state.lipaiResult.playerIndex} dealerIndex={state.dealerIndex} lipaiResult={state.lipaiResult} />
        ) : (
          <>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10">
              <PlayerArea
                playerIndex={2}
                name={state.players[2].name}
                score={state.players[2].score}
                isActive={state.currentPlayerIndex === 2}
                isDealer={state.dealerIndex === 2}
                trickPlay={state.trickPlays.find(tp => tp.playerIndex === 2) ?? null}
              />
            </div>
            <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10">
              <PlayerArea
                playerIndex={1}
                name={state.players[1].name}
                score={state.players[1].score}
                isActive={state.currentPlayerIndex === 1}
                isDealer={state.dealerIndex === 1}
                trickPlay={state.trickPlays.find(tp => tp.playerIndex === 1) ?? null}
              />
            </div>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
              <PlayerArea
                playerIndex={3}
                name={state.players[3].name}
                score={state.players[3].score}
                isActive={state.currentPlayerIndex === 3}
                isDealer={state.dealerIndex === 3}
                trickPlay={state.trickPlays.find(tp => tp.playerIndex === 3) ?? null}
              />
            </div>
          </>
        )}

        {/* 中央信息（非例牌时显示） */}
        {!isLipaiDisplay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
              {state.isDecisiveRound && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[11px] font-bold animate-pulse">决胜轮!</span>
              )}
              {state.chainType !== 'none' && state.chainState !== 'broken' && (
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${state.chainState === 'active' ? 'bg-yellow-500 text-black' : state.chainState === 'ended' ? 'bg-orange-500 text-white' : 'bg-yellow-800 text-yellow-200'}`}>
                  {getChainTypeName(state.chainType)}
                  {state.chainState === 'notOpened' && '(待触发)'}
                  {state.chainState === 'active' && ` · ${state.suppressionCount}压`}
                  {state.chainState === 'ended' && ' · 已结束'}
                </span>
              )}
              <div className="text-[13px] text-amber-200 font-semibold text-center bg-black/40 px-4 py-1.5 rounded-lg max-w-[280px]">
                {state.message}
              </div>
            </div>
          </div>
        )}

        {!isLipaiDisplay && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10">
            <PlayerArea
              playerIndex={0}
              name={state.players[0].name}
              score={state.players[0].score}
              isActive={state.currentPlayerIndex === 0}
              isDealer={state.dealerIndex === 0}
              trickPlay={state.trickPlays.find(tp => tp.playerIndex === 0) ?? null}
            />
          </div>
        )}
      </div>

      {/* 手牌区域 */}
      <div className="mt-2 w-full max-w-[640px] overflow-x-auto">
        <div className="flex flex-nowrap justify-center gap-px">
          {humanPlayer.hand.map(card => {
            const isSelected = selectedIds.has(card.id);
            return (
              <button
                key={card.id}
                onClick={() => toggleCard(card.id)}
                disabled={!isHumanTurn}
                className={`
                  w-9 h-[52px] rounded border flex flex-col items-center justify-center
                  font-bold shadow transition-all duration-150 select-none shrink-0
                  ${card.color === 'red' ? 'border-red-300 bg-white text-red-600' : 'border-gray-300 bg-white text-gray-800'}
                  ${isSelected ? 'border-yellow-400 bg-yellow-50 -translate-y-2 ring-2 ring-yellow-400' : ''}
                  ${!isHumanTurn || isLipaiDisplay ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg active:scale-95'}
                `}
              >
                <span className="text-[13px] leading-none">{SUIT_SYMBOLS[card.suit]}</span>
                <span className="text-[11px] leading-none font-black">{RANK_DISPLAY[card.rank]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-3 flex flex-col items-center gap-2 min-h-[80px]">
        {state.phase === 'idle' && (
          <div className="flex gap-3">
            <button onClick={startGame} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg text-lg transition-all hover:scale-105 active:scale-95">
              开始游戏
            </button>
          </div>
        )}

        {isHumanTurn && state.phase === 'leading' && (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm text-green-200">选择1~4张牌领出</p>
            <button onClick={confirmPlay} disabled={selectedIds.size === 0} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-500 disabled:opacity-50 text-white font-bold rounded-lg shadow transition-all">
              出牌 ({selectedIds.size}张)
            </button>
          </div>
        )}

        {isHumanTurn && state.phase === 'following' && (
          <div className="flex flex-col items-center gap-1.5">
            {isZeroScoreLocked ? (
              <p className="text-sm text-red-300 font-bold animate-pulse">零分锁死！自动垫牌中…</p>
            ) : (
              <>
                <p className="text-sm text-green-200">
                  需要{leadCardCount}张({leadBlackCount}黑{leadRedCount}红)
                  {canBeatCurrent ? ' · 你可以压牌' : ' · 无法压牌，只能垫牌'}
                </p>
                <div className="flex gap-3">
                  {canBeatCurrent && (
                    <button onClick={confirmPlay} disabled={selectedIds.size !== leadCardCount} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-500 disabled:opacity-50 text-white font-bold rounded-lg shadow transition-all">
                      出牌 ({selectedIds.size}/{leadCardCount}张)
                    </button>
                  )}
                  <button onClick={confirmFold} disabled={selectedIds.size !== leadCardCount} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:opacity-50 text-white font-bold rounded-lg shadow transition-all">
                    垫牌 ({selectedIds.size}/{leadCardCount}张)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {state.phase === 'game_over' && (
          <div className="flex gap-3">
            <button onClick={nextRound} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow transition-all">
              下一局
            </button>
          </div>
        )}

        {state.phase === 'lipai' && (
          <p className="text-sm text-red-300 font-bold animate-pulse">例牌天胡！亮牌中…</p>
        )}

        {state.phase === 'game_over' && state.lipaiResult && (
          <p className="text-sm text-red-300 font-bold">例牌天胡！点击「下一局」继续</p>
        )}

        {state.phase === 'trick_end' && (
          <p className="text-sm text-amber-200 animate-pulse">准备下一回合…</p>
        )}
      </div>

      {/* 结算面板 */}
      {state.phase === 'game_over' && state.lipaiResult && (
        <LipaiSettlement lipaiResult={state.lipaiResult} players={state.players.map(p => ({ name: p.name }))} />
      )}

      {state.phase === 'game_over' && !state.lipaiResult && decisiveDetails && (
        <ScoreSettlement
          scores={decisiveDetails}
          players={state.players.map(p => ({ name: p.name, score: p.score }))}
          winnerIndex={state.decisiveRoundWinner}
          cumulativeScores={cumScores}
          deltas={decisiveDeltas ?? [0, 0, 0, 0]}
          roundBonusTotal={state.roundBonusTotal}
          chainType={state.chainType}
          suppressionCount={state.suppressionCount}
        />
      )}


    </div>
  );
}
