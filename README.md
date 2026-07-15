# LIVE — 配信型ホラーアドベンチャー

コメント欄と配信用カメラの「見え方のズレ」を使って怪異を発見する、ブラウザ向け2Dサイドスクロール・ホラーゲームです。

廃病院または下校放送の止まらない旧校舎を生配信しながら探索し、肉眼では見えない怪異をPIPカメラで記録します。視聴者コメントには攻略の手掛かりも混ざりますが、すべてが人間から届いた言葉とは限りません。

## 現在の開発工程

現在は **改善プロトタイプ工程** です。盤面選択の「品質ゲート用ビルドを開始」から、病院STANDARDの固定経路で `撮影 → 同接上昇 → 観測者接近 → 逃走 → 脱出 → LIVE残留` を3〜5分で検証します。

廃校、周回、複数エンディングなどの既存拡張は参考実装として凍結中です。改善プロトタイプの品質ゲートと人間オーナー承認が完了するまで、Vertical Sliceへ進みません。運用ルールは [AI組織型開発ワークフロー](docs/AI_DEVELOPMENT_WORKFLOW.md)、判定状況は [品質ゲート2](docs/QUALITY_GATE_02_IMPROVEMENT_PROTOTYPE.md) を参照してください。

## ゲームの特徴

- **配信画面そのものがゲームUI** — 同時接続数、コメント、映像ノイズ、回線状態が物語と連動します。
- **同じ廊下を映す二つの視点** — 2D探索画面の向き・上下照準・扉や棚の位置を、右上の一人称PIPカメラへ投影します。
- **遅延する第二の真実** — PIPは同じ世界状態を400〜700ms遅れて映し、カメラにしか現れない怪異を含みます。
- **反応するコメント欄** — 撮影可能な異変、見落とした証拠、危険な進行へ視聴者が先に反応し、正しいヒント・嘘・配信侵食が混ざります。
- **光で情報を切り分ける探索** — 明るい中心光、読める中間光、暗い外周を分け、扉・棚・カーテンなどが光と怪異を遮ります。
- **視聴者数＝接近するリスク** — 撮影で237 → 2,370 → 23,700 → 237,000と注目が増えるほど、PIPの観測者が近づき、コメントとMain映像へ侵食します。
- **明確な短編ミッション** — 「侵入 → 異変 → 撮影 → 配信異常 → 脱出」を常時表示し、最後は脱出か配信継続かを選びます。
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
| 懐中電灯・カメラの向き | マウス移動、または探索画面をタッチしてドラッグ |
| 懐中電灯 | `F` |
| 調べる | `E` |
| 怪異を撮影 | `Space` またはPIP内の `CAPTURE` |

歩きながら照準を動かせます。怪異を撮影するには、対象へ近づき、懐中電灯を点け、PIPの取得枠へ対象を入れてください。

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

ゲーム進行と配信状態は `src/AppV2.tsx`、盤面は `src/game/boardDefinitions.ts`、リアルタイムの探索描画は `src/components/MainGameView.tsx` に分離しています。MainとPIPは `src/game/sceneSnapshot.ts` の共通SceneSnapshot履歴と `src/game/cameraProjection.ts` の投影規則を使い、背景・設備は `src/game/sceneDefinitions.ts` でデータ定義しています。コメント連動は `src/game/broadcastEventDirector.ts`、光の遮蔽判定は `src/game/flashlightOcclusion.ts` が担当します。

現在工程の正本は [AI組織型開発ワークフロー](docs/AI_DEVELOPMENT_WORKFLOW.md) と [品質ゲート2](docs/QUALITY_GATE_02_IMPROVEMENT_PROTOTYPE.md) です。クリエイティブ基準は [Creative Direction v4](docs/CREATIVE_DIRECTION_V4.md)、代表遭遇の仕様は [Vertical Slice & Gimmick Direction v4](docs/VERTICAL_SLICE_GIMMICKS_V4.md)、画像制作と実装契約は [Art & Asset Bible v4](docs/ART_ASSET_BIBLE_V4.md) を参照してください。盤面・周回拡張の [Expansion v3.2](docs/EXPANSION_V3_2.md) とv3.1資料は、品質ゲート2通過まで参考資料として凍結します。

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
