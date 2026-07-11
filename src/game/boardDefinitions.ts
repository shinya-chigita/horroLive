import type {
  Anomaly,
  AnomalyDirectorPhase,
  BoardId,
  Chapter,
  Comment,
  EndingType,
  GameItem,
  RiskTier,
  RunMode,
} from '../types.ts';
import { CHAPTERS } from '../types.ts';

export interface IntroBeat {
  label: string;
  text: string;
}

export interface EndingCopy {
  code: string;
  title: string;
  body: string;
}

export interface RiskCue {
  username: string;
  text: string;
  log: string;
}

export interface AnomalyChatCue {
  telegraph: string;
  active: string;
  ignored: string;
  missed: string;
}

export interface BoardChatLines {
  ambient: readonly string[];
  dark: readonly string[];
  running: readonly string[];
  nearby: readonly string[];
  hijack: readonly string[];
}

export interface BoardModeDefinition {
  id: RunMode;
  label: string;
  description: string;
  initialRiskTier: RiskTier;
  initialBattery: number;
  initialTension: number;
  batteryDrainMultiplier: number;
  telegraphDurationMultiplier: number;
  activeWindowMultiplier: number;
}

export interface BoardRouteRule {
  chapterId: number;
  requirementItemId: string;
  kind: 'LOCK' | 'LOOP';
  targetX: number;
  log: string;
  chat: string;
}

export interface BoardDefinition {
  id: BoardId;
  caseNumber: string;
  code: string;
  title: string;
  subtitle: string;
  locationLabel: string;
  description: string;
  worldEnd: number;
  chapters: readonly Chapter[];
  intros: readonly IntroBeat[];
  initialLogs: readonly string[];
  seedComments: readonly Omit<Comment, 'id' | 'timestamp'>[];
  items: readonly Omit<GameItem, 'found'>[];
  anomalies: readonly Omit<
    Anomaly,
    'captured' | 'directorState' | 'resolution'
  >[];
  routeRules: readonly BoardRouteRule[];
  chatLines: BoardChatLines;
  anomalyChat: Readonly<Record<string, AnomalyChatCue>>;
  riskCues: Readonly<Record<number, RiskCue>>;
  endings: Readonly<Record<EndingType, EndingCopy>>;
  modes: Readonly<Record<RunMode, BoardModeDefinition>>;
}

const STANDARD_MODE: BoardModeDefinition = {
  id: 'STANDARD',
  label: '通常配信',
  description: '手掛かりを比較しながら進む標準の調査条件。',
  initialRiskTier: 0,
  initialBattery: 100,
  initialTension: 10,
  batteryDrainMultiplier: 1,
  telegraphDurationMultiplier: 1,
  activeWindowMultiplier: 1,
};

const DEEP_BROADCAST_MODE: BoardModeDefinition = {
  id: 'DEEP_BROADCAST',
  label: '深夜再送',
  description: '同接2,370から開始。予兆が短く、電池消費も速い周回モード。',
  initialRiskTier: 1,
  initialBattery: 72,
  initialTension: 24,
  batteryDrainMultiplier: 1.25,
  telegraphDurationMultiplier: 0.82,
  activeWindowMultiplier: 0.78,
};

const SHARED_MODES: Readonly<Record<RunMode, BoardModeDefinition>> = {
  STANDARD: STANDARD_MODE,
  DEEP_BROADCAST: DEEP_BROADCAST_MODE,
};

const HOSPITAL_ITEMS: readonly Omit<GameItem, 'found'>[] = [
  {
    id: 'KEYCARD_BLUE',
    name: '診察室のブルーカードキー',
    description: '診察室および遺体安置所の扉を開放するセキュリティカード。',
    type: 'keycard',
  },
  {
    id: 'DIARY_1',
    name: '看護師の手記（ちぎれた一頁）',
    description: '1998年の事件当夜に書かれたものと思われる記録。',
    type: 'diary',
    content:
      '「23時47分、電子機器が一斉にノイズを吐いた。霊安室の扉は、誰もいない内側から三度だけ叩かれた。」',
  },
  {
    id: 'DIARY_2',
    name: '古い配信機材に残されたログ',
    description: 'ここで失踪した配信者の、送信されなかった下書き。',
    type: 'diary',
    content:
      '「顔認識が空の廊下に十個出ている。映っているのは俺じゃない。レンズの向こうが、こちらを数えている。」',
  },
  {
    id: 'PHOTO_OLD',
    name: '祭壇に残された集合写真',
    description: '地下で行われた配信実験の参加者名簿を兼ねた写真。',
    type: 'photo',
    content:
      '「視聴者の視線を入口にする。数が増えるほど、映像の内側が現実へ近づく。」',
  },
];

const HOSPITAL_ANOMALIES: BoardDefinition['anomalies'] = [
  {
    id: 'hospital.anomaly.footsteps',
    x: 600,
    width: 42,
    type: 'orb',
    description: 'Mainでは一歩、PIPでは逆向きに増える濡れた足跡',
    points: 8_000,
    visibleOnlyInPip: false,
    yOffset: 35,
    sceneId: 'hospital-entry',
  },
  {
    id: 'hospital.anomaly.door-figure',
    x: 1_500,
    width: 58,
    type: 'ghost',
    description: '扉の陰に髪と肩だけを残す遠景人物',
    points: 25_000,
    visibleOnlyInPip: true,
    yOffset: -8,
    sceneId: 'hospital-ward-a',
  },
  {
    id: 'hospital.anomaly.2347',
    x: 2_000,
    width: 76,
    type: 'writing',
    description: 'コメントより遅れて壁に現れる「23:47」',
    points: 15_000,
    visibleOnlyInPip: false,
    yOffset: 10,
    sceneId: 'hospital-ward-a',
  },
  {
    id: 'hospital.anomaly.wheelchair',
    x: 2_900,
    width: 54,
    type: 'doll',
    description: 'フレーム反復のたび向きが変わる車椅子の頭髪と手',
    points: 18_000,
    visibleOnlyInPip: false,
    yOffset: 1,
    sceneId: 'hospital-clinical-wing',
  },
  {
    id: 'hospital.anomaly.ceiling',
    x: 4_100,
    width: 68,
    type: 'ghost',
    description: 'PIP上端から垂れる濡れた髪と指先',
    points: 35_000,
    visibleOnlyInPip: true,
    yOffset: -58,
    sceneId: 'hospital-signal-basement',
  },
  {
    id: 'hospital.anomaly.altar-shadow',
    x: 4_750,
    width: 90,
    type: 'shadow',
    description: '祭壇の奥からライトだけを遮る巨大な輪郭',
    points: 45_000,
    visibleOnlyInPip: false,
    yOffset: -18,
    sceneId: 'hospital-altar',
  },
];

const SCHOOL_CHAPTERS: readonly Chapter[] = [
  {
    id: 1,
    title: 'Chapter 1: ABSENT',
    subtitle: '雨守市立・黒羽分校 昇降口',
    startPos: 0,
    endPos: 900,
    description: '濡れた靴跡の数と、靴箱に残る名札の数を照合する。',
  },
  {
    id: 2,
    title: 'Chapter 2: THE SAME HALL',
    subtitle: '二階教室棟・2年B組前',
    startPos: 900,
    endPos: 1_800,
    description: '黒板、窓、コメント欄の時刻を比較し、放送室の録音テープを探す。',
  },
  {
    id: 3,
    title: 'Chapter 3: HOMEROOM',
    subtitle: '旧放送室・校内回線',
    startPos: 1_800,
    endPos: 2_700,
    description: '無人のマイクが読み上げる欠席者を、PIPで記録する。',
  },
  {
    id: 4,
    title: 'Chapter 4: AFTER SCHOOL',
    subtitle: '階段踊り場・屋上扉',
    startPos: 2_700,
    endPos: 3_600,
    description: '同じ踊り場へ戻る前に、放送を止めて校外へ出る。',
  },
];

const SCHOOL_ITEMS: readonly Omit<GameItem, 'found'>[] = [
  {
    id: 'SCHOOL_TAPE',
    name: '放送委員会・最終録音テープ',
    description: '放送室へ続く廊下のループを止める鍵になる古いテープ。',
    type: 'keycard',
    content: '「欠席者を読み上げるまで、下校放送は終わらない。」',
  },
  {
    id: 'SCHOOL_ROLL',
    name: '2年B組 出席簿',
    description: '廃校後の日付に、一人分だけ出席印が押され続けている。',
    type: 'diary',
    content: '名簿の最後には、配信者の名前を書くための空欄が残されている。',
  },
  {
    id: 'SCHOOL_NOTE',
    name: '日直日誌「放送を聞くな」',
    description: '同じ一文を筆圧だけ変えて書き重ねた日誌。',
    type: 'diary',
    content: '「名前を呼ばれても返事をしない。窓の反射を数えない。」',
  },
  {
    id: 'SCHOOL_PHOTO',
    name: '屋上前の卒業写真',
    description: '列の端に、撮影時にはいなかった空白の制服だけが写る。',
    type: 'photo',
    content: '写真の裏には23:47と、配信開始時刻が先回りして記されている。',
  },
];

const SCHOOL_ANOMALIES: BoardDefinition['anomalies'] = [
  {
    id: 'school.anomaly.shoe-locker',
    x: 560,
    width: 44,
    type: 'shadow',
    description: '靴箱の隙間で一段ずつ位置を変える指先',
    points: 9_000,
    visibleOnlyInPip: false,
    yOffset: 30,
    sceneId: 'school-entrance',
  },
  {
    id: 'school.anomaly.window-student',
    x: 1_320,
    width: 58,
    type: 'ghost',
    description: '窓の反射にだけ増える、肩から上の欠席者',
    points: 24_000,
    visibleOnlyInPip: true,
    yOffset: -12,
    sceneId: 'school-classrooms',
  },
  {
    id: 'school.anomaly.blackboard',
    x: 1_690,
    width: 76,
    type: 'writing',
    description: 'MainとPIPで出席人数が違う黒板',
    points: 18_000,
    visibleOnlyInPip: false,
    yOffset: 2,
    sceneId: 'school-classrooms',
  },
  {
    id: 'school.anomaly.microphone',
    x: 2_250,
    width: 54,
    type: 'doll',
    description: '誰もいないのに呼吸で曇る放送室マイク',
    points: 28_000,
    visibleOnlyInPip: true,
    yOffset: -4,
    sceneId: 'school-broadcast-room',
  },
  {
    id: 'school.anomaly.landing',
    x: 3_270,
    width: 78,
    type: 'ghost',
    description: '廊下を一周するたび画面端へ近づく濡れた肩',
    points: 42_000,
    visibleOnlyInPip: true,
    yOffset: -9,
    sceneId: 'school-stairwell',
  },
];

const endings = (
  archiveTitle: string,
  archiveBody: string,
  liveTitle: string,
  liveBody: string,
  escapeTitle: string,
  escapeBody: string,
): Readonly<Record<EndingType, EndingCopy>> => ({
  LOST_ARCHIVE: {
    code: 'ENDING A / TRUE ARCHIVE',
    title: archiveTitle,
    body: archiveBody,
  },
  OVER_EXPLOITED: {
    code: 'ENDING B / NEVER OFFLINE',
    title: liveTitle,
    body: liveBody,
  },
  ESCAPED: {
    code: 'ENDING C / SIGNAL SAVED',
    title: escapeTitle,
    body: escapeBody,
  },
});

const HOSPITAL_BOARD: BoardDefinition = {
  id: 'hospital',
  caseNumber: 'CASE 01',
  code: 'SHIRONAKI / 23:47',
  title: '白鳴霊園付属病棟',
  subtitle: '視聴者の視線を入口にする廃病院',
  locationLabel: '廃病院「白鳴霊園付属病棟」',
  description: '遅延する胸カメラと、失踪配信者の記録を照合する長い病棟。',
  worldEnd: 5_000,
  chapters: CHAPTERS,
  intros: [
    { label: '23:42 / OUTSIDE', text: '「配信者が何人も消えた廃病院。肉眼にいなくても、カメラには残るらしい。」' },
    { label: '23:47 / SIGNAL ONLINE', text: '「頼れるのはライト、遅れて届く胸カメラ、それから先に気づくコメント欄だけ。」' },
    { label: '23:49 / RULE DISCOVERED', text: '「怪異を中央に捉えて記録する。同接が増えるほど、映像の内側も近づいてくる。」' },
    { label: '23:50 / DOOR UNSEALED', text: '「祭壇まで行き、記録を持ち帰る。画面のどれか一つだけを信じないこと。」' },
  ],
  initialLogs: [
    'LIVE配信接続完了。',
    'ストリームチャンネル：心霊突撃Ch 開設。',
    '白鳴霊園付属病棟へ侵入。三系統の記録を開始した。',
  ],
  seedComments: [
    { username: 'kage_oni', text: '始まった。右上もちゃんと見てる', type: 'normal' },
    { username: 'cyber_neko', text: '今日どこ？ また廃墟かよw', type: 'normal' },
    { username: 'mizuki_v', text: '右上だけ、廊下が少し長くない？', type: 'hint' },
  ],
  items: HOSPITAL_ITEMS,
  anomalies: HOSPITAL_ANOMALIES,
  routeRules: [
    {
      chapterId: 2,
      requirementItemId: 'KEYCARD_BLUE',
      kind: 'LOCK',
      targetX: 2_320,
      log: '【LOCKED】診察室は施錠されている。第一病棟でカードキーを探せ。',
      chat: 'カードキー取り忘れてる。開いたロッカーの近く！',
    },
  ],
  chatLines: {
    ambient: ['同接じわじわ増えてる', '奥に行くほど時計が戻ってない？', '右上だけ色味が違う', '手記は全部拾って'],
    dark: ['ライト消えた？', '右上だけ顔認識してる', '暗闇の左端、さっきより狭い'],
    running: ['足音が一人分多い', 'カメラぶれすぎ。でも止まるな', '今の角、誰か避けた？'],
    nearby: ['右上を見て', '止まって比較して', '肉眼にはいない', '中央に合わせて'],
    hijack: ['23:47　接続済み', '病室番号：あなたの部屋', '退出者の名前がありません', '視聴者は、もう中にいます'],
  },
  anomalyChat: Object.fromEntries(
    HOSPITAL_ANOMALIES.map((anomaly) => [
      anomaly.id,
      {
        telegraph: `待って。${anomaly.description}、右上が先に変わった`,
        active: '今、同じ場所なのに距離が合ってない',
        ignored: '見なかったことにした？　まだ後ろに残ってる',
        missed: 'フレームが戻った。さっきより近い',
      },
    ]),
  ),
  riskCues: {
    237: { username: 'SYSTEM_LIVE', text: '同時視聴 237。三系統の同期を確認しています。', log: '遠方の不一致監視を開始した。' },
    2_370: { username: 'nanashi', text: '右上だけ見て。扉の陰に髪がある。', log: 'PIPが遮蔽された輪郭を検出した。' },
    23_700: { username: 'uro_27', text: 'freeze明け、同じ影が三歩近い。', log: '映像復帰後の距離が一致しない。' },
    237_000: { username: 'SYSTEM_237000', text: '配信者を退出させました。視聴者は中にいます。', log: '配信制御権が外部へ移行した。' },
  },
  endings: endings(
    '深淵の真実',
    'すべての記録は一本の配信へ結び直された。失踪事件は、視聴者の視線を入口にする実験だった。アーカイブを再生するたび、視聴者数は一人ずつ増え続ける。',
    '終わらない配信',
    '同接は限界を超え、終了ボタンは消えた。コメント欄には配信者の部屋が映り、次の視聴者を待つまでLIVEだけが続く。',
    '朝まで生きる',
    '撮れ高より命を選び、夜明け前の道路へ転がり出た。背後の病院から聞こえる通知音には、もう振り返らなかった。',
  ),
  modes: SHARED_MODES,
};

const SCHOOL_BOARD: BoardDefinition = {
  id: 'school',
  caseNumber: 'CASE 02',
  code: 'KUROHANE / 00:13',
  title: '雨守市立・黒羽分校',
  subtitle: '下校放送だけが終わらない廃校',
  locationLabel: '廃校「雨守市立・黒羽分校」',
  description: '同じ廊下へ戻る旧校舎。黒板、窓、校内放送が互いに違う欠席者を示す。',
  worldEnd: 3_600,
  chapters: SCHOOL_CHAPTERS,
  intros: [
    { label: '00:08 / SCHOOL GATE', text: '「二十年前に閉校した分校から、毎晩0時13分に下校放送が流れる。」' },
    { label: '00:11 / ROLL CALL', text: '「黒板と出席簿の人数が違う。コメント欄は、もう一人いると言っている。」' },
    { label: '00:12 / LOOP ARMED', text: '「録音テープを見つけるまで、二階廊下は同じ曲がり角へ戻される。」' },
    { label: '00:13 / BROADCAST LIVE', text: '「名前を呼ばれても返事をしない。窓の反射を数えない。配信、開始。」' },
  ],
  initialLogs: [
    'LIVE配信接続完了。',
    '黒羽分校・校内回線へ周波数を固定。',
    '昇降口へ侵入。下校放送は無人のまま継続している。',
  ],
  seedComments: [
    { username: 'momo_3', text: '閉校したの、二十年前だよね', type: 'normal' },
    { username: 'goma_shio', text: '黒板の日付が明日になってる', type: 'hint' },
    { username: 'room_2B', text: '放送はもう始まっています', type: 'glitch' },
  ],
  items: SCHOOL_ITEMS,
  anomalies: SCHOOL_ANOMALIES,
  routeRules: [
    {
      chapterId: 2,
      requirementItemId: 'SCHOOL_TAPE',
      kind: 'LOOP',
      targetX: 980,
      log: '【ROUTE LOOP】階段を上ったはずが、2年B組前へ戻っている。録音テープを探せ。',
      chat: 'また同じ廊下。右上だけ、戻る前の映像が残ってる',
    },
  ],
  chatLines: {
    ambient: ['机、ひとつ増えてない？', '時計が0:13から動かない', 'その教室、さっきも通った', '出席簿を探して'],
    dark: ['窓の反射だけ明るい', 'ライト消したら放送が近い', '靴箱の中で何か動いた'],
    running: ['走る音とチャイムが同期してる', '階段なのに景色が横へ流れた', 'また2年B組だ'],
    nearby: ['黒板より右上を見て', '窓際、肩だけ映ってる', '返事するな', '録音ボタンは押すな'],
    hijack: ['2年B組　欠席一名', '出席番号：配信者', '下校時刻はありません', 'room_2B: 返事をしてください'],
  },
  anomalyChat: Object.fromEntries(
    SCHOOL_ANOMALIES.map((anomaly) => [
      anomaly.id,
      {
        telegraph: `先にコメントする。${anomaly.description}が来る`,
        active: '右上で位置が変わった。Mainは空のまま',
        ignored: '通り過ぎたのに、放送だけついてくる',
        missed: '名前を呼ばれた。今のは撮るべきだった',
      },
    ]),
  ),
  riskCues: {
    237: { username: 'SYSTEM_LIVE', text: '同時視聴 237。校内回線へ接続しました。', log: '下校放送と配信時刻の比較を開始した。' },
    2_370: { username: 'room_2B', text: '窓際に欠席者がいます。', log: 'PIPが教室窓に余分な肩を検出した。' },
    23_700: { username: 'broadcast_club', text: '二周目。踊り場の影が一段近い。', log: 'ループ後の被写体距離が短縮している。' },
    237_000: { username: 'SYSTEM_0013', text: '出席を確認しました。下校は許可されません。', log: '校内放送が配信者の名前を読み上げた。' },
  },
  endings: endings(
    '欠席者名簿',
    '出席簿、録音、写真は一人分の空白へ収束した。最後の録音には、まだ訪れていない配信者の返事まで残っている。',
    '永久放送',
    '視聴者の名前が出席番号へ置き換わり、下校放送はLIVEを乗っ取った。黒板には次の配信時刻だけが書かれている。',
    '始業前',
    '屋上扉の外で夜がほどけた。背後のスピーカーは最後まで名前を呼んだが、返事をしなかった者だけが校門を越えられた。',
  ),
  modes: SHARED_MODES,
};

export const BOARD_DEFINITIONS: Readonly<Record<BoardId, BoardDefinition>> = {
  hospital: HOSPITAL_BOARD,
  school: SCHOOL_BOARD,
};

export const BOARD_IDS = Object.freeze(Object.keys(BOARD_DEFINITIONS) as BoardId[]);

export function getBoardDefinition(boardId: BoardId): BoardDefinition {
  return BOARD_DEFINITIONS[boardId];
}

export function createBoardItems(boardId: BoardId): GameItem[] {
  return BOARD_DEFINITIONS[boardId].items.map((item) => ({ ...item, found: false }));
}

export function createBoardAnomalies(boardId: BoardId): Anomaly[] {
  return BOARD_DEFINITIONS[boardId].anomalies.map((anomaly) => ({
    ...anomaly,
    captured: false,
    resolution: null,
  }));
}

export function createBoardComments(boardId: BoardId, now = Date.now()): Comment[] {
  return BOARD_DEFINITIONS[boardId].seedComments.map((comment, index, comments) => ({
    ...comment,
    id: `${boardId}-seed-${index + 1}`,
    timestamp: now - (comments.length - index) * 1_000,
  }));
}

export function getAnomalyChatCue(
  boardId: BoardId,
  anomalyId: string,
  phase: AnomalyDirectorPhase,
): string | null {
  const cue = BOARD_DEFINITIONS[boardId].anomalyChat[anomalyId];
  if (!cue) return null;
  if (phase === 'TELEGRAPH') return cue.telegraph;
  if (phase === 'ACTIVE') return cue.active;
  if (phase === 'IGNORED') return cue.ignored;
  if (phase === 'MISSED') return cue.missed;
  return null;
}
