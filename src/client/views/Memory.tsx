import React, { useEffect, useMemo, useRef, useState } from 'react';
import './css/memory.css';
import './css/nav.css';

type Card = {
  id: number;
  emoji: string; // for emoji mode, this is the emoji; for theme mode, this is the image URL
  matched: boolean;
  revealed: boolean;
};

type ThemeInfo = { id: string; name: string };
type ThemeAssets = { face: string | null; cards: { code: string; url: string }[] };

const EMOJIS = [
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮',
  '🐷','🐸','🐵','🐤','🐥','🐧','🐦','🦆','🦉','🦄','🐝','🦋',
  '🌸','🌼','🌻','🍓','🍉','🍎','🍌','🍒','🍇','🍍','🥕','🌽',
  '🚗','🚲','🚀','🛸','🎈','🎁','🎨','🎵','⚽','🏀','🍪','🍰'
];

const Memory: React.FC = () => {
  const [size, setSize] = useState<number>(18);
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [p1Pairs, setP1Pairs] = useState<number>(0);
  const [p2Pairs, setP2Pairs] = useState<number>(0);
  const [selection, setSelection] = useState<number[]>([]);
  const [seed, setSeed] = useState<number>(0);
  const [themeId, setThemeId] = useState<string>('emoji');
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [themeAssets, setThemeAssets] = useState<ThemeAssets | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const pairsCount = useMemo(() => Math.floor(size / 2), [size]);

  // Build deck based on theme or emojis
  const buildDeck = () => {
    if (themeId === 'emoji' || !themeAssets || !themeAssets.cards || themeAssets.cards.length === 0) {
      const available = [...EMOJIS];
      const chosen: string[] = [];
      while (chosen.length < pairsCount && available.length > 0) {
        const idx = Math.floor(Math.random() * available.length);
        chosen.push(available.splice(idx, 1)[0]);
      }
      const deckEmojis = chosen.flatMap((e) => [e, e]);
      const deck: Card[] = deckEmojis.map((e, i) => ({ id: i, emoji: e, matched: false, revealed: false }));
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
      }
      setCards(deck);
      return;
    }
    const availableImages = [...themeAssets.cards.map(c => c.url)];
    const chosenImgs: string[] = [];
    while (chosenImgs.length < pairsCount && availableImages.length > 0) {
      const idx = Math.floor(Math.random() * availableImages.length);
      chosenImgs.push(availableImages.splice(idx, 1)[0]);
    }
    const deckImgs = chosenImgs.flatMap((u) => [u, u]);
    const deck: Card[] = deckImgs.map((u, i) => ({ id: i, emoji: u, matched: false, revealed: false }));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    setCards(deck);
  };

  const resetGame = (newSize?: number) => {
    const s = newSize ?? size;
    setSize(s);
    setSeed(prev => prev + 1); // force deck re-shuffle even if size unchanged
    setCards([]);
    setBusy(false);
    setCurrentPlayer(1);
    setP1Pairs(0);
    setP2Pairs(0);
    setSelection([]);
  };

  // Fetch themes on mount
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const res = await fetch('/api/themes');
        const data = await res.json();
        setThemes((data?.themes ?? []).filter((t: ThemeInfo) => !!t?.id));
      } catch {}
    };
    fetchThemes();
  }, []);

  // Fetch theme assets when theme changes (non-emoji)
  useEffect(() => {
    if (themeId === 'emoji') {
      setThemeAssets(null);
      return;
    }
    const fetchAssets = async () => {
      try {
        const res = await fetch(`/api/themes/${encodeURIComponent(themeId)}/images`);
        const data = await res.json();
        const assets: ThemeAssets = { face: data?.face ?? null, cards: data?.cards ?? [] };
        setThemeAssets(assets);
      } catch {
        setThemeAssets(null);
      }
    };
    fetchAssets();
  }, [themeId]);

  // Rebuild deck when size/seed/theme/assets change
  useEffect(() => {
    buildDeck();
  }, [pairsCount, seed, themeId, themeAssets?.cards?.length]);

  const onPickSize = (s: number) => {
    resetGame(s);
  };

  const onPickTheme = (id: string) => {
    setThemeId(id);
    // Shuffle anew for the new theme
    resetGame();
  };

  const allMatched = useMemo(() => cards.length > 0 && cards.every(c => c.matched), [cards]);

  const layout = useMemo(() => {
    if (size <= 18) return { cols: 6, rows: 3 };
    return { cols: 7, rows: 4 };
  }, [size]);

  const computeSizing = () => {
    const el = boardRef.current;
    if (!el) return;
    const gap = 12; // must match CSS .board gap
    const padV = 24; // .board vertical padding (12px top + 12px bottom)
    const border = 4; // card border thickness (px)
    const bw = el.clientWidth;
    const bh = el.clientHeight;
    const perColSpace = (bw - gap * (layout.cols - 1)) / layout.cols;
    const wByWidth = Math.floor(perColSpace - 2 * border);

    const heightRatio = 3 / 5; // CSS: .card height = var(--card-size) * 3/5
    const totalAvailableH = bh - padV - gap * (layout.rows - 1);
    if (totalAvailableH <= 0) return;
    const perRowSpace = totalAvailableH / layout.rows;
    const wByHeight = Math.floor((perRowSpace - 2 * border) / heightRatio);

    const card = Math.max(28, Math.min(wByWidth, wByHeight));
    el.style.setProperty('--card-size', `${card}px`);
  };

  useEffect(() => {
    computeSizing();
    const onResize = () => computeSizing();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [layout]);

  // Recompute once cards mount to ensure height is measured
  useEffect(() => {
    computeSizing();
  }, [cards.length]);

  // React to board size changes (e.g., nav wraps or container height changes)
  const rafIdRef = useRef<number | null>(null);
  useEffect(() => {
    const el = boardRef.current;
    const RObserver = (window as any).ResizeObserver;
    if (!el || !RObserver) return;
    const ro = new RObserver(() => {
      if (rafIdRef.current == null) {
        rafIdRef.current = window.requestAnimationFrame(() => {
          rafIdRef.current = null;
          computeSizing();
        });
      }
    });
    ro.observe(el);
    return () => {
      try { ro.disconnect(); } catch {}
      if (rafIdRef.current != null) {
        try { window.cancelAnimationFrame(rafIdRef.current); } catch {}
        rafIdRef.current = null;
      }
    };
  }, [layout]);

  const onCardClick = (index: number) => {
    if (busy) return;
    const c = cards[index];
    if (!c || c.matched || c.revealed) return;
    const nextCards = cards.slice();
    nextCards[index] = { ...c, revealed: true };
    const nextSelection = [...selection, index];
    setCards(nextCards);
    setSelection(nextSelection);

    if (nextSelection.length === 2) {
      setBusy(true);
      const [aIdx, bIdx] = nextSelection;
      const a = nextCards[aIdx];
      const b = nextCards[bIdx];
      const isMatch = a && b && a.emoji === b.emoji;
      setTimeout(() => {
        if (isMatch) {
          const updated = nextCards.slice();
          updated[aIdx] = { ...updated[aIdx], matched: true };
          updated[bIdx] = { ...updated[bIdx], matched: true };
          setCards(updated);
          if (currentPlayer === 1) setP1Pairs(p => p + 1); else setP2Pairs(p => p + 1);
          setBusy(false);
        } else {
          const updated = nextCards.slice();
          updated[aIdx] = { ...updated[aIdx], revealed: false };
          updated[bIdx] = { ...updated[bIdx], revealed: false };
          setCards(updated);
          setBusy(false);
          setCurrentPlayer(cp => (cp === 1 ? 2 : 1));
        }
        setSelection([]);
      }, 700);
    }
  };

  return (
    <div className="memory">
      <nav className="nav" aria-label="Memory Controls">
        <ul className="pill-menu">
          <li>
            <span className="pill p3" onClick={() => { try { window.history.pushState({}, '', '/home'); window.dispatchEvent(new PopStateEvent('popstate')); } catch {} }}>Home</span>
          </li>
          <li>
            <label className="pill pill-select p1" aria-label="Select Theme">
              <span style={{ marginRight: 8 }}>Theme:</span>
              <select value={themeId} onChange={(e) => onPickTheme(e.target.value)}>
                <option value="emoji">Emoji (default)</option>
                {themes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          </li>
          <li>
            <span className="pill p0" onClick={() => resetGame()}>New Game</span>
          </li>
          <li>
            <span className="pill p1" onClick={() => onPickSize(18)}>18 Cards</span>
          </li>
          <li>
            <span className="pill p2" onClick={() => onPickSize(28)}>28 Cards</span>
          </li>
          {/* 48-card option removed */}
          <li className="score-inline" aria-label="Scoreboard">
            <span className={currentPlayer === 1 ? 'score-badge active' : 'score-badge'}>
              <span className="count">{p1Pairs}</span>
            </span>
            <span className="who">Player 1</span>
            <span>&nbsp;&nbsp;&nbsp;&nbsp;</span>
            <span className="who">Player 2</span>
            <span className={currentPlayer === 2 ? 'score-badge active' : 'score-badge'}>
              <span className="count">{p2Pairs}</span>
            </span>
          </li>
        </ul>
      </nav>

      <div
        ref={boardRef}
        className="board"
        style={{ gridTemplateColumns: `repeat(${layout.cols}, var(--card-size))` }}
      >
        {cards.map((card, idx) => (
          <button
            key={card.id}
            className={
              card.matched ? 'card matched' : card.revealed ? 'card revealed' : 'card'
            }
            onClick={() => onCardClick(idx)}
          >
            <div className="face front" aria-hidden>
              {themeId !== 'emoji' && themeAssets?.face ? (
                <img src={themeAssets.face} alt="Card back" />
              ) : (
                '🎅'
              )}
            </div>
            <div className="face back" aria-hidden>
              {themeId !== 'emoji' ? (
                <img src={card.emoji} alt="Card" />
              ) : (
                card.emoji
              )}
            </div>
          </button>
        ))}
      </div>

      {allMatched && (
        <div className="game-over" role="dialog" aria-modal="true">
          <div className="card">
            <div className="title">Game Over!</div>
            <div className="detail">
              {p1Pairs === p2Pairs ? 'It\'s a tie!' : (p1Pairs > p2Pairs ? 'Player 1 wins!' : 'Player 2 wins!')}
            </div>
            <div className="actions">
              <button className="pill p0" onClick={() => resetGame()}>Play Again</button>
              <button className="pill p3" onClick={() => { try { window.history.pushState({}, '', '/home'); window.dispatchEvent(new PopStateEvent('popstate')); } catch {} }}>Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Memory;
