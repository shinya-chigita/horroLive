# LIVE — 配信型ホラーアドベンチャー

コメント欄と配信用カメラの「見え方のズレ」を使って怪異を発見する、ブラウザ向け2Dサイドスクロール・ホラーゲームです。

廃病院または下校放送の止まらない旧校舎を生配信しながら探索し、肉眼では見えない怪異をPIPカメラで記録します。視聴者コメントには攻略の手掛かりも混ざりますが、すべてが人間から届いた言葉とは限りません。

## ゲームの特徴

- **配信画面そのものがゲームUI** — 同時接続数、コメント、映像ノイズ、回線状態が物語と連動します。
- **二つの視点** — メイン画面と配信用PIPカメラで、見えるものが異なります。
- **遅延する第二の真実** — PIPは同じ世界状態を400〜700ms遅れて映し、カメラにしか現れない怪異を含みます。
- **動的な恐怖演出** — プレイヤーの位置、ライト、緊張度に応じてコメント、音、映像が変化します。
- **視聴者数＝リスク** — 237 → 2,370 → 23,700 → 237,000の段階で配信への侵食が強くなります。
- **記録と分岐** — 怪異の撮影数、発見した手掛かり、最終視聴者数によって結末が変わります。
- **二つの盤面** — 廃病院と廃校で、章・証拠・怪異・進行ルールがすべて変わります。廃校では必要な録音テープを見つけるまで同じ廊下へ戻されます。
- **周回記録** — 盤面ごとのクリア、エンディング、アーカイブ率を端末に保存。初回クリア後は高難度の「深夜再送」を選べます。
- **PC・タッチ操作対応** — キーボードに加え、画面上の操作ボタンでも進行できます。

## 操作方法

| 操作 | キー |
| --- | --- |
| 左右移動 | `A` / `D` または `←` / `→` |
| 走る | `Shift` + 移動 |
| しゃがむ | `S` / `↓` / `Ctrl` |
| 懐中電灯 | `F` |
| 調べる | `E` |
| 怪異を撮影 | `Space` またはPIP内の `CAPTURE` |

怪異を撮影するには、対象へ近づき、懐中電灯を点けた状態でPIPカメラの反応を待ってください。

## ローカルで実行

前提: Node.js 22 以降

```bash
npm install
npm run dev
```

開発サーバーは既定で `http://localhost:3000` に起動します。

## 品質チェック

```bash
npm run lint
npm test
npm run build
```

このアプリは完全なクライアントサイド構成です。現在のゲーム実行にAPIキーや環境変数は不要です。

## 技術構成

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- Canvas 2D
- Web Audio API
- lucide-react

ゲーム進行と配信状態は `src/AppV2.tsx`、盤面は `src/game/boardDefinitions.ts`、リアルタイムの探索描画は `src/components/MainGameView.tsx` に分離しています。MainとPIPは `src/game/sceneSnapshot.ts` の共通SceneSnapshot履歴を使い、背景・設備は `src/game/sceneDefinitions.ts` でデータ定義しています。

最新のクリエイティブ基準は [Creative Direction v4](docs/CREATIVE_DIRECTION_V4.md)、代表遭遇の仕様は [Vertical Slice & Gimmick Direction v4](docs/VERTICAL_SLICE_GIMMICKS_V4.md)、画像制作と実装契約は [Art & Asset Bible v4](docs/ART_ASSET_BIBLE_V4.md)、盤面・周回拡張は [Expansion v3.2](docs/EXPANSION_V3_2.md) を参照してください。v3.1資料は履歴として残しています。

コンセプト制作物:

- [主人公ディレクション](assets/concepts/character-direction-v4.png)
- [廃病院小物ディレクション](assets/concepts/hospital-props-direction-v4.png)
- [主怪異「観測者」ディレクション](assets/concepts/observer-direction-v4-v2.png)

## デプロイ

GitHub Actions から Cloudflare Pages へ自動デプロイします。

- `main` へのpush: 本番デプロイ
- Pull Request: ブランチごとのプレビューデプロイ
- Quality gate: `npm run lint` → `npm test` → `npm run build`
- Output directory: `dist`

初回のみ、リポジトリのActions secretsに以下を登録してください。

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 注意

本作には、強い光の点滅、突然の大音量、ジャンプスケア、ホラー表現が含まれます。体調に不安がある場合はプレイを中止してください。
