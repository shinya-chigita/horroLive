/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  GamePhase, 
  PlayerState, 
  Comment, 
  GameItem, 
  Anomaly, 
  CHAPTERS, 
  EndingType 
} from './types';
import TitleScreen from './components/TitleScreen';
import StreamHeader from './components/StreamHeader';
import PipCamera from './components/PipCamera';
import LiveChat from './components/LiveChat';
import MainGameView from './components/MainGameView';
import InvestigationJournal from './components/InvestigationJournal';
import { AudioSynth } from './utils/audio';
import { AlertCircle, RotateCcw } from 'lucide-react';

const USER_NAMES = [
  'yuyu_game', 'shin_oni', 'shiba_dog', 'piko_piko', 'horror_girl', 'tarou_k',
  'mizuki_v', 'kage_99', 'nanashi_san', 'goma_shio', 'taku_games', 'momo_3',
  'ghost_hunter', 'zero_gravity', 'tanaka_taro', 'horo_horo', 'shinya_ha'
];

const BADGES: ('mod' | 'subscriber' | undefined)[] = ['mod', 'subscriber', undefined, undefined, undefined];

export default function App() {
  // Game state
  const [phase, setPhase] = useState<GamePhase>('TITLE');
  const [chapterId, setChapterId] = useState(1);
  const [viewerCount, setViewerCount] = useState(237);
  const [isMuted, setIsMuted] = useState(false);

  // Player State
  const [player, setPlayer] = useState<PlayerState>({
    x: 10,
    speed: 1.8,
    isRunning: false,
    isCrouching: false,
    flashlightOn: true,
    facing: 1,
    flashlightAngle: 0,
    battery: 100,
    tension: 10,
    health: 100
  });

  // Items State
  const [items, setItems] = useState<GameItem[]>([
    {
      id: 'KEYCARD_BLUE',
      name: '診察室のブルーカードキー',
      description: '診察室および遺体安置所の扉を開放するためのセキュリティカードキー。',
      found: false,
      type: 'keycard'
    },
    {
      id: 'DIARY_1',
      name: '看護師の手記（ちぎれた一頁）',
      description: '1998年の事件当夜に書かれたものと思われる記録。',
      found: false,
      type: 'diary',
      content: '「23時47分、突然電子機器が一斉にノイズを吐き始めた。霊安室の扉が内側から叩かれている…これは仕込みじゃない…」'
    },
    {
      id: 'DIARY_2',
      name: '古い配信機材に残されたログ',
      description: '過去にここで失踪した配信者の最後のテキスト下書き。',
      found: false,
      type: 'diary',
      content: '「バズるために来た。カメラの顔認識が、何もない廊下に10個も出ている。奴らはレンズ越しにこちらを見ている…」'
    },
    {
      id: 'PHOTO_OLD',
      name: '祭壇に残された集合写真',
      description: 'かつてこの病院の地下で行われていた、集団生配信儀式の記録写真。',
      found: false,
      type: 'photo',
      content: '「視聴者を媒介にして、彼岸と此岸を接続するLIVE配信儀式。視聴者数が増えるほど、呪いは増幅する。」'
    }
  ]);

  // Anomalies / Paranormal Entities
  const [anomalies, setAnomalies] = useState<Anomaly[]>([
    { id: 'ANOMALY_1', x: 600, width: 40, type: 'orb', description: '浮遊する蒼い光球（オーブ）', points: 8000, captured: false, visibleOnlyInPip: false, yOffset: -30 },
    { id: 'ANOMALY_2', x: 1500, width: 60, type: 'ghost', description: '鏡の奥に佇む顔の白い少女影', points: 25000, captured: false, visibleOnlyInPip: true, yOffset: -10 },
    { id: 'ANOMALY_3', x: 2000, width: 80, type: 'writing', description: '壁に勝手に浮かび上がる呪詛文字', points: 15000, captured: false, visibleOnlyInPip: false, yOffset: 10 },
    { id: 'ANOMALY_4', x: 2900, width: 50, type: 'doll', description: '車椅子に置かれた勝手に動く日本人形', points: 18000, captured: false, visibleOnlyInPip: false, yOffset: 0 },
    { id: 'ANOMALY_5', x: 4100, width: 70, type: 'ghost', description: '廊下の天井から逆さに吊る下がる男', points: 35000, captured: false, visibleOnlyInPip: true, yOffset: -50 },
    { id: 'ANOMALY_6', x: 4750, width: 90, type: 'shadow', description: '祭壇を覆い尽くす巨大な影', points: 45000, captured: false, visibleOnlyInPip: false, yOffset: -20 }
  ]);

  // Logs List
  const [logs, setLogs] = useState<string[]>([
    'LIVE配信接続完了。',
    'ストリームチャンネル：心霊突撃Ch 開設。',
    '廃病院『白鳴霊園付属病棟』不法侵入中。'
  ]);

  // Comments List
  const [comments, setComments] = useState<Comment[]>([
    { id: '1', username: 'kage_oni', text: '始まった！待ってたで！', type: 'normal', timestamp: Date.now() - 3000 },
    { id: '2', username: 'cyber_neko', text: '今日どこ？また廃墟かよw', type: 'normal', timestamp: Date.now() - 2000 },
    { id: '3', username: 'mizuki_v', text: '画質ちょっと低くない？わざと？', type: 'normal', timestamp: Date.now() - 1000 }
  ]);

  const [endingType, setEndingType] = useState<EndingType>('ESCAPED');

  // Find nearest anomaly to player
  const getNearestAnomaly = (): { anomaly: Anomaly | null; distance: number } => {
    let nearest: Anomaly | null = null;
    let minDistance = 99999;

    anomalies.forEach((a) => {
      const dist = Math.abs(player.x - a.x);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = a;
      }
    });

    return { anomaly: nearest, distance: minDistance };
  };

  const { anomaly: nearestAnomaly, distance: nearestDistance } = getNearestAnomaly();

  // Story Intro text scroll
  const [introStep, setIntroStep] = useState(0);
  const INTRO_TEXTS = [
    "「よおみんな！今夜はガチで曰く付きの廃病院に来たぜ。10年前に集団失踪事件があって以来、完全に封鎖された『白鳴霊園付属病棟』だ。」",
    "「『ここで生配信をすると生きて帰れない』とかいう都市伝説があるけど、バズるためには最高だろ？今夜こそ同接10万再生を叩き出してやるぜ。」",
    "「懐中電灯とこの配信カメラだけで奥まで突き進むから、みんなコメント欄で反応頼むわ。右上にカメラの一人称画面も出しとくからな。」",
    "「よし…侵入成功だ。不気味な廊下が続いてる…奥の心霊部屋まで行って撮影し、生きて脱出するぞ！配信開始だ！」"
  ];

  // Dynamic commentary generator loop
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    const interval = setInterval(() => {
      const user = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
      const badge = BADGES[Math.floor(Math.random() * BADGES.length)];

      let text = 'がんばえー！';
      let type: 'normal' | 'hype' | 'spooky' | 'glitch' | 'hint' = 'normal';

      if (player.tension > 80) {
        const spookies = [
          'ギャアアアア！今の何！', 'うしろ！うしろ！', '右上カメラに顔認識でてる！',
          'やばいやばいやばい', 'もう逃げろって！呪われる！', '配信切ったほうがいい',
          '画面おかしくなってない？', 'み　え　て　る　よ', 'お前の後ろにいる'
        ];
        text = spookies[Math.floor(Math.random() * spookies.length)];
        type = Math.random() > 0.4 ? 'spooky' : 'glitch';
      } else if (!player.flashlightOn) {
        const darks = [
          '暗くて何も見えん！', 'ライトつけてー！', '暗闇に何か立つ気配する',
          'ビビって消したん？w', 'フラッシュたいてくれ', '何もおもしろくないw'
        ];
        text = darks[Math.floor(Math.random() * darks.length)];
        type = 'normal';
      } else if (player.isRunning) {
        const runs = [
          'カメラぶれすぎw', 'めっちゃ逃げるやん', '走るな酔うわw',
          'ゆっくり見せてー！', '息荒くて草', '走るとお化けに気づかれるぞ'
        ];
        text = runs[Math.floor(Math.random() * runs.length)];
        type = 'normal';
      } else if (nearestAnomaly && nearestDistance < 400 && !nearestAnomaly.captured) {
        const hints = [
          'おい、右上カメラ見ろ！', '今影が動いたぞ', 'そこ！そこ照らして！',
          'なんている気がする…', '右上右上右上！', 'キャプチャーして！撮れ高やぞ！',
          'そこになんかある！調べろ!'
        ];
        text = hints[Math.floor(Math.random() * hints.length)];
        type = 'hint';
      } else {
        const regulars = [
          'ここまじで不気味やな', '仕込みじゃないよね？w', 'バズってきたな',
          '同接増えてる！', 'チャンネル登録したわ', '霊安室あるかな？',
          '次の扉を開けてみて！', 'がんばれ！応援しとるで', '警察来ない？大丈夫？'
        ];
        text = regulars[Math.floor(Math.random() * regulars.length)];
        type = 'normal';
      }

      if (chapterId >= 4 && Math.random() < 0.4) {
        const glitches = [
          'しんじゅしんじゅしんじゅ', 'おまえもこっちにこい', 'おまえがおまえがおまえが',
          '†††††††††', '死死死死死死', '逃げられないよ', 'L I V E は終 わ ら な い'
        ];
        text = glitches[Math.floor(Math.random() * glitches.length)];
        type = 'glitch';
      }

      const newComment: Comment = {
        id: String(Date.now()),
        username: user,
        text,
        type,
        timestamp: Date.now(),
        badge
      };

      setComments((prev) => [...prev.slice(-45), newComment]);
      
      setViewerCount((prev) => {
        const multiplier = chapterId * 1.5;
        const add = Math.floor(Math.random() * 50 * multiplier) + 10;
        return prev + add;
      });

      if (type !== 'glitch' && Math.random() < 0.3) {
        AudioSynth.playNotification();
      }

    }, 1800);

    return () => clearInterval(interval);
  }, [phase, player, nearestAnomaly, nearestDistance, chapterId]);

  // Self-induced tension health deplete rule
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    const interval = setInterval(() => {
      if (player.tension > 90) {
        setPlayer((prev) => {
          const nextHealth = Math.max(0, prev.health - 2);
          if (nextHealth <= 0) {
            setPhase('GAMEOVER');
            AudioSynth.playStinger();
          }
          return { ...prev, health: nextHealth };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, player.tension]);

  // Toggle mute handler
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    AudioSynth.setMuted(nextMuted);
  };

  const handleAddLog = (logText: string) => {
    setLogs((prev) => [...prev, logText]);
  };

  const handleAddComment = (text: string, isPlayer: boolean) => {
    const newComment: Comment = {
      id: String(Date.now()),
      username: isPlayer ? 'STREAMER' : 'anonymous',
      text,
      type: isPlayer ? 'normal' : 'normal',
      timestamp: Date.now()
    };
    setComments((prev) => [...prev, newComment]);
  };

  const handleCaptureAnomaly = () => {
    if (!nearestAnomaly) return;

    if (nearestDistance < 350 && !nearestAnomaly.captured && player.flashlightOn) {
      const updated = anomalies.map((a) => {
        if (a.id === nearestAnomaly.id) {
          return { ...a, captured: true };
        }
        return a;
      });
      setAnomalies(updated);

      AudioSynth.playCaptureSuccess();
      AudioSynth.playGlitch();

      const bonusViewers = nearestAnomaly.points;
      setViewerCount((prev) => prev + bonusViewers);

      handleAddLog(`【撮影成功】${nearestAnomaly.description} をカメラに収めた！ (+${bonusViewers} 視聴者)`);

      const newComment: Comment = {
        id: String(Date.now()),
        username: 'mod_taku',
        text: `【スクショ成功】ガチでヤバいやつ激撮キタァアア！ +${bonusViewers} 人！`,
        type: 'hype',
        badge: 'mod',
        timestamp: Date.now()
      };
      setComments((prev) => [...prev, newComment]);
    } else {
      AudioSynth.playNotification();
      handleAddLog("【撮影失敗】何も捉えられなかった。ライトが点いているか、怪異が十分近いか確認してください。");
    }
  };

  const handleTriggerScare = (type: 'jumpscare' | 'chase' | 'whisper') => {
    AudioSynth.playStinger();
    AudioSynth.playGlitch();

    if (type === 'jumpscare') {
      setPlayer((prev) => ({ ...prev, tension: Math.min(100, prev.tension + 35) }));
    } else if (type === 'chase') {
      setPlayer((prev) => ({ ...prev, tension: 95 }));
    } else {
      setPlayer((prev) => ({ ...prev, tension: Math.min(100, prev.tension + 15) }));
    }
  };

  const handleChapterComplete = () => {
    if (chapterId < 5) {
      if (chapterId === 2 && !items.find((i) => i.id === 'KEYCARD_BLUE')?.found) {
        handleAddLog("【警告】診察室の扉はロックされている！カードキーを探せ。");
        setPlayer((prev) => ({ ...prev, x: 2350 })); 
        return;
      }

      const nextChapter = chapterId + 1;
      setChapterId(nextChapter);
      handleAddLog(`【チャプター完了】 ${CHAPTERS[chapterId - 1].title} を突破！`);
      AudioSynth.playNotification();
    } else {
      resolveEnding();
    }
  };

  const resolveEnding = () => {
    const totalFound = items.filter((i) => i.found).length;
    
    if (viewerCount > 100000 && totalFound === 4) {
      setEndingType('LOST_ARCHIVE');
    } else if (viewerCount > 130000) {
      setEndingType('OVER_EXPLOITED');
    } else {
      setEndingType('ESCAPED');
    }

    setPhase('ENDING');
    AudioSynth.playStinger();
  };

  const handlePickupItem = (itemId: string) => {
    const updated = items.map((i) => {
      if (i.id === itemId) {
        return { ...i, found: true };
      }
      return i;
    });
    setItems(updated);

    const item = items.find((i) => i.id === itemId);
    if (item) {
      AudioSynth.playCaptureSuccess();
      handleAddLog(`【アイテム発見】「${item.name}」を取得した。`);
      setViewerCount((prev) => prev + 5000);
    }
  };

  const handleRetry = () => {
    setPlayer({
      x: chapterId === 1 ? 10 : chapterId === 2 ? 1220 : chapterId === 3 ? 2420 : chapterId === 4 ? 3620 : 4520,
      speed: 1.8,
      isRunning: false,
      isCrouching: false,
      flashlightOn: true,
      facing: 1,
      flashlightAngle: 0,
      battery: 100,
      tension: 10,
      health: 100
    });
    setPhase('PLAYING');
    handleAddLog("【復帰】配信接続を再試行し、直前のセーフドアから再開した。");
  };

  return (
    <div 
      id="app-root-container" 
      className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col justify-between select-none overflow-hidden relative"
    >
      {/* 1. TITLE SCREEN PHASE */}
      {phase === 'TITLE' && (
        <TitleScreen onStartGame={() => setPhase('INTRO_STORY')} />
      )}

      {/* 2. INTRO NARRATIVE STORY TELLER */}
      {phase === 'INTRO_STORY' && (
        <div id="intro-story-container" className="fixed inset-0 bg-[#050505] flex items-center justify-center p-6 z-50">
          <div className="absolute inset-0 bg-radial-[circle_450px_at_50%_45%] from-[#fffee0]/10 via-[#050505] to-[#020202] opacity-80 pointer-events-none" />
          <div className="absolute inset-0 crt-scanlines opacity-20 pointer-events-none" />
          
          <div className="w-full max-w-lg bg-[#0a0a0c] border border-white/5 rounded-lg p-6 space-y-6 shadow-2xl relative z-10">
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
              <h3 className="text-[10px] font-black text-red-500 font-mono tracking-widest uppercase">STREAM TRANSMISSION SETUP</h3>
            </div>

            <div className="p-4 bg-black rounded-md border border-white/5 min-h-[140px] flex items-center">
              <p className="text-zinc-200 text-xs leading-relaxed font-sans font-light">
                {INTRO_TEXTS[introStep]}
              </p>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                INTRO DIALOGUE {introStep + 1} / {INTRO_TEXTS.length}
              </span>
              
              <button
                onClick={() => {
                  if (introStep < INTRO_TEXTS.length - 1) {
                    setIntroStep((prev) => prev + 1);
                    AudioSynth.playNotification();
                  } else {
                    setPhase('PLAYING');
                    AudioSynth.playNotification();
                  }
                }}
                className="px-6 py-2.5 rounded-md bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white font-extrabold text-[10px] tracking-widest uppercase transition-all duration-300 shadow-md shadow-red-950/40 cursor-pointer"
              >
                {introStep < INTRO_TEXTS.length - 1 ? 'NEXT (次へ)' : 'START BROADCAST (配信開始)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CORE PLAYING VIEWPORTS */}
      {phase === 'PLAYING' && (
        <div id="game-active-layout" className="flex-1 flex flex-col justify-between">
          <StreamHeader
            viewerCount={viewerCount}
            battery={player.battery}
            tension={player.tension}
            chapterTitle={CHAPTERS[chapterId - 1].title}
            chapterSubtitle={CHAPTERS[chapterId - 1].subtitle}
            onToggleMute={handleToggleMute}
            isMuted={isMuted}
          />

          <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 p-4 gap-4 max-w-7xl w-full mx-auto relative z-20">
            {/* Left Col (Game Viewport & Notes) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <MainGameView
                player={player}
                setPlayer={setPlayer}
                anomalies={anomalies}
                onAnomaliesUpdate={setAnomalies}
                items={items}
                onAddLog={handleAddLog}
                onPickupItem={handlePickupItem}
                onTriggerScare={handleTriggerScare}
                currentChapterId={chapterId}
                onChapterComplete={handleChapterComplete}
                onCaptureAnomaly={handleCaptureAnomaly}
              />

              <div className="flex-1 min-h-[220px]">
                <InvestigationJournal
                  items={items}
                  anomalies={anomalies}
                  logs={logs}
                />
              </div>
            </div>

            {/* Right Col (PIP feed & Stream comments panel) */}
            <div className="lg:col-span-1 flex flex-col gap-4 h-full">
              <div className="shrink-0">
                <PipCamera
                  currentAnomaly={nearestAnomaly}
                  anomalyDistance={nearestDistance}
                  tension={player.tension}
                  flashlightOn={player.flashlightOn}
                  onCaptureAnomaly={handleCaptureAnomaly}
                  canCapture={nearestAnomaly ? nearestDistance < 350 && !nearestAnomaly.captured && player.flashlightOn : false}
                />
              </div>

              <div className="flex-1 min-h-[300px]">
                <LiveChat
                  comments={comments}
                  onAddComment={handleAddComment}
                  tension={player.tension}
                  flashlightOn={player.flashlightOn}
                  isRunning={player.isRunning}
                />
              </div>
            </div>
          </main>
        </div>
      )}

      {/* 4. ENDING SEQUENCE PHASES */}
      {phase === 'ENDING' && (
        <div id="game-ending-sequence" className="fixed inset-0 bg-[#050505] flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="absolute inset-0 bg-radial-[circle_450px_at_50%_45%] from-[#fffee0]/10 via-[#050505] to-[#020202] opacity-80 pointer-events-none" />
          <div className="absolute inset-0 crt-scanlines opacity-20 pointer-events-none" />

          <div className="w-full max-w-xl bg-[#0a0a0c] border border-white/5 rounded-lg p-6 md:p-8 space-y-6 shadow-[0_30px_70px_rgba(0,0,0,0.95)] relative text-center z-10">
            <div className="space-y-2">
              <span className="text-[10px] bg-red-950/60 text-red-500 font-extrabold border border-red-800/40 px-2.5 py-1 rounded font-mono uppercase tracking-widest">
                STREAM TERMINATION ARCHIVE
              </span>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-2">
                {endingType === 'LOST_ARCHIVE' ? 'ENDING A: THE LOST ARCHIVE (深淵の真実)' :
                 endingType === 'OVER_EXPLOITED' ? 'ENDING B: FULLY EXPLOITED (狂気のバズ)' :
                 'ENDING C: COWARDLY RETREAT (臆病な脱出)'}
              </h2>
            </div>

            <div className="p-4 md:p-5 bg-black rounded-md border border-white/5 text-left text-xs text-zinc-300 leading-relaxed space-y-3 font-sans font-light">
              {endingType === 'LOST_ARCHIVE' ? (
                <p>
                  君はすべての手記と異常写真を集め、この廃墟の奥に隠されたおぞましい儀式を発見した。
                  過去の失踪事件は、配信カメラを通じて彼岸を接続する生贄儀式だったのだ。
                  儀式を完全にカメラに収め、視聴者も真実に到達した。君のアーカイブはネットに深く刻まれ、語り継がれるだろう。
                </p>
              ) : endingType === 'OVER_EXPLOITED' ? (
                <p>
                  バズりのために突き進んだ君は、同接10万再生を超える怪物ストリーマーとなった。
                  しかし、視聴者数が爆増するにつれて活性化した「何か」に完全に部屋を取り囲まれた。
                  配信終了ボタンは壊れている。赤いLIVEの文字は点滅し、君自身が永遠の配信ループへと引きずり込まれた。
                </p>
              ) : (
                <p>
                  君は命を最優先し、途中で狂気を振り切って廃病院から脱出した。
                  同接数は物足りない結果となり、コメント欄には「仕込み乙」「チキンw」と叩かれた。
                  しかし、生きて朝を迎えることができた。それ以上の価値など存在しない。
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 border-y border-white/5 py-4 font-mono text-[11px]">
              <div className="text-center">
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider">FINAL VIEWERS</div>
                <div className="text-sm font-black text-white/95 mt-1">{viewerCount.toLocaleString()} 人</div>
              </div>
              <div className="text-center border-x border-white/5">
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider">CLUES FOUND</div>
                <div className="text-sm font-black text-white/95 mt-1">{items.filter(i => i.found).length} / 4</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider">VIRAL PHENOMENA</div>
                <div className="text-sm font-black text-white/95 mt-1">{anomalies.filter(a => a.captured).length} / 6</div>
              </div>
            </div>

            <button
              onClick={() => {
                setChapterId(1);
                setViewerCount(237);
                setPlayer({
                  x: 10,
                  speed: 1.8,
                  isRunning: false,
                  isCrouching: false,
                  flashlightOn: true,
                  facing: 1,
                  flashlightAngle: 0,
                  battery: 100,
                  tension: 10,
                  health: 100
                });
                setItems(items.map(i => ({ ...i, found: false })));
                setAnomalies(anomalies.map(a => ({ ...a, captured: false })));
                setPhase('TITLE');
                AudioSynth.playNotification();
              }}
              className="px-6 py-2.5 bg-zinc-950 hover:bg-[#111115] border border-white/10 text-zinc-300 hover:text-white rounded-md text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer"
            >
              RETRACT BACK TO TITLE (タイトルに戻る)
            </button>
          </div>
        </div>
      )}

      {/* 5. GAME OVER / SIGNAL INTERRUPTED */}
      {phase === 'GAMEOVER' && (
        <div id="game-over-container" className="fixed inset-0 bg-red-950/20 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-sm bg-black border border-red-900/35 rounded-lg p-6 text-center space-y-6 shadow-2xl relative">
            <div className="absolute inset-0 crt-scanlines opacity-30 pointer-events-none" />
            
            <div className="text-red-500 flex justify-center">
              <AlertCircle className="w-16 h-16 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black font-mono tracking-widest text-red-600 uppercase">SIGNAL LOST</h2>
              <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">CONNECTION TERMINATED BY GHOST HOST</p>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans font-light">
              精神侵食率（TENSION）が限界に達し、配信用カメラの電波および君自身の精神同調が切断されました。
            </p>

            <button
              onClick={handleRetry}
              className="w-full py-3 bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white font-extrabold rounded text-xs tracking-widest uppercase transition-all duration-300 shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REBOOT STREAM TRANSCEIVER</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
