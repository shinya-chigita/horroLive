# 品質ゲート2 Ultracode監査報告 — 2026-07-15

対象: `shinya-chigita/horroLive` 改善プロトタイプ工程
起点: `main@e196e2e84743d3e25af3b14b6bf6efa1b29d7d74`
作業ブランチ: `codex/gate-2-ultracode-audit`
総合判定: **HOLD**

## 結論

実ブラウザで、足跡 → PIP限定人影 → 反復する車椅子 → CHASE → 非常口 → LIVE単独残留を完走した。最終DOMは次の値だった。

- `data-prototype-duration-ms="234203"`
- `data-prototype-duration-band="IN_TARGET"`
- `data-prototype-sequence-complete="true"`
- `#main-game-viewport`, `.pip-slot`, `.chat-slot`, `.stream-status-line`: 各0件
- `section.post-live-only[role="status"]`: 1件
- 最終LIVEは30秒後も自動遷移せず残留

ただし、234.203秒には追跡解除後の安全地点で追加した130秒の観察を含む。熟練した最短寄りの操作では約2分で非常口へ到達できるため、「自然な初見体験として3〜5分」は未承認である。reduced-motionの実ブラウザエミュレーション、実タブhidden→resume、スマホで目的を再表示して閉じる操作も未完了のため、PRはマージしない。

## 修正済み不具合

| 重要度 | 問題 | 修正 | 回帰根拠 |
| --- | --- | --- | --- |
| S | 最初の必須足跡が入口ベッドに完全遮蔽され、遮蔽解除前に `IGNORED` となる | 改善プロトタイプだけ足跡をx=400へ移動。通常病院はx=600を維持 | 全必須怪異のACTIVE撮影窓探索テスト、通常経路分離assert、実ブラウザ撮影成功 |
| A | 低FPSの可視フレームを250msへ切り詰め、有効時間を過少計測する | visibilityで基準時刻をrebaseし、可視中の実差分を全量加算 | 1秒フレームとhidden復帰の純粋テスト、最終DOM 234203ms |
| B | Main外でもA/D/F/E/Spaceを奪い、ボタンのSpace操作を横取りする | Mainのfocus-withinかつ非インタラクティブ対象だけゲーム入力を許可 | `gameplayInput.test.ts`、実ブラウザでミュート操作後に再有効化表示 |
| B | PIP撮影ボタンへフォーカスが残りMain操作が止まる | PIP撮影後の次フレームでMainへフォーカスを戻す | 撮影後にMain `[active]`、通しプレイ継続 |
| B | hidden復帰時にMain/PIPの時間が飛ぶ競合 | RAF自身のvisibility guard、同期rebase、PIP期限のpause延長 | 純粋クロックテスト、静的レビュー |
| B | スマホで目的を再表示すると自動で閉じず、閉じるボタンも消える | 開くたび5秒タイマーを再設定し、閉じるボタンを残す | タイマー依存修正、モバイルDOM/CSS確認 |
| C | スマホ横で目的とミッショントラッカーが重なる | 目的表示中はミッショントラッカーを隠す | 667×375の実ブラウザ目視 |
| B | PIPのバッテリーが遅延値で、現在値と全撮影経路の判定がずれる | 表示・PIPボタン・App撮影判定入口に現在のplayer batteryを反映 | 純粋回帰テスト、独立レビュー、型検査 |
| C | 改善プロトタイプの目的表示が0/4となる | 必須3撮影だけを分母へ使用 | 実ブラウザで0/3→3/3 |

## 実ブラウザQA

| ケース | 結果 | 証跡・観測 |
| --- | --- | --- |
| Desktop 1440×900 | PASS | 3撮影、237→2,370→23,700→237,000、CHASE、脱出、234.203秒、順序完了 |
| PIP限定人影 | PASS | Mainに人物なし、PIP取得枠と先行コメントを確認 |
| 失敗→Retry | PASS | 必須撮影を意図的に逃し、章境界で再試行位置へ巻き戻ることを確認 |
| スマホ横 667×375 | PARTIAL | UI配置とタッチ右移動を確認。目的の再表示→閉じる一連操作は未実施 |
| ゲームパッド相当 | PASS（相当入力のみ） | `Shift + D` 相当の同時入力、フォーカス喪失時のキー解除、CHASE解除を確認。物理Gamepad API対応とは扱わない |
| reduced motion | HOLD | CSS/コード経路は存在するが、このブラウザ面でmedia emulationを有効化できず実機未確認 |
| hidden→resume | HOLD | visibility guardと純粋テストは合格。実タブの非表示→復帰を同一通しで未確認 |
| 最終LIVE | PASS | Main/PIP/Chat/ステータス行0件、LIVE 1件、30秒残留 |

## 残課題

| 重要度 | 状態 | 内容 | 次の最小確認 |
| --- | --- | --- | --- |
| B | OPEN / gate-blocking | 熟練ルートは約2分で非常口へ到達し、自然な3〜5分を保証しない | 人間初見3名程度で中央値を計測。UNDER_TARGETなら距離延長ではなく既存遭遇の観察・判断時間を調整 |
| B | OPEN / gate-blocking | reduced-motionの実ブラウザ完走がない | `prefers-reduced-motion: reduce` を有効にして3撮影・CHASE・最終LIVEを再確認 |
| B | OPEN / gate-blocking | hidden→resumeの統合確認がない | TELEGRAPH/ACTIVE中にタブを非表示、復帰後に失効・時間加算・入力残りがないことを確認 |
| B | OPEN / gate-blocking | スマホ目的の再表示→閉じる操作を実タッチで未確認 | 667×375で目的を再表示し、閉じる・5秒再非表示・ミッション重なりなしを確認 |
| C | OPEN | PIP遅延フレームがREADYの直後に現状態がMISSEDになると、短時間だけREADY表示と失敗結果がずれる | 遅延フレームのcycle/timestampを撮影判定へ渡すか、失効猶予をPIP最大遅延と整合させる |

## 自動確認

- `npm run lint`: PASS
- `npm test`: 131 / 131 PASS
- `npm run build`: PASS
- `git diff --check`: PASS（WindowsのLF/CRLF警告のみ）
- 独立パッチレビュー: S/A追加指摘なし。B候補2件を修正し再確認

## 証跡

- [PIP限定人影](../artifacts/qa/gate2-desktop-pip-only.png)
- [スマホ横UI](../artifacts/qa/gate2-mobile-landscape.png)
- [最終LIVE](../artifacts/qa/gate2-desktop-final-live.png)
- [修正前の開始画面（進行停止再現に使用）](../artifacts/qa/gate2-desktop-start.png)

## リリース判断

S/A級の既知不具合は修正済みで、デスクトップの必須シーケンスと最終LIVEは成立した。しかし上記4件のgate-blocking B相当確認が残るため、品質ゲート2は **HOLD** とする。PRはレビュー可能な状態まで作成するが、自動マージは行わず、人間オーナーの `品質ゲート2：承認` も代理記録しない。
