# 日本語ローカライズ作業計画 (Beanconqueror)

> 対象リポジトリ: `nyagasan/beanconqueror` (fork)
> 方針メモ:
> - フォーク専用での対応をまず行う（本家への PR は今回対象外）。
> - コーヒー専門用語は **「英語のまま」「カタカナ」「日本語訳」** を用語ごとに適切に判断するため、専用の **用語集 (glossary)** を作って整理する。

---

## 0. 前提理解 (調査結果サマリ)

- 翻訳基盤: `@ngx-translate/core` + JSON ファイル。
- 言語ファイル: `src/assets/i18n/{lang}.json`（現状 14 言語、各約 1,680 行 / 約 1,500 キー）。
- 言語切替に関連する主な参照点:
  - `src/app/app.component.ts` … OS 言語自動判定 (`__setDeviceLanguage`)、フォールバック設定、`moment.locale()` 設定。
  - `src/app/settings/settings.page.html` … 設定画面の言語ドロップダウン (`<ion-select-option>`)。
  - `src/app/settings/settings.page.ts` … 言語変更時の `translate.use` / `moment.locale`。
  - `src/services/uiHelper.ts` … `moment/locale/de` の import（locale の事前ロード）。
  - `src/assets/i18n/en.json` 内の `PAGE_SETTINGS_LANGUAGE_*` キー群。

---

## 1. 計画ステップ

### フェーズ A: 設計と準備

- [ ] **A-1. 用語集 (glossary) ドラフト作成**
      コーヒー専門用語を「英語のまま / カタカナ / 日本語訳」のいずれにするか方針整理。判断基準:
      - 日本のコーヒー業界で**カタカナが定着**している語 → カタカナ
        例: Brew → ブリュー / 抽出, Bloom → ブルーム / 蒸らし, Cupping → カッピング, Espresso → エスプレッソ, Roast → ロースト, Pour over → プアオーバー / ハンドドリップ
      - 日本語訳が**一般的・自然**な語 → 日本語訳
        例: Beans → 豆, Grinder/Mill → グラインダー（カタカナ寄り）/ ミル, Water → 水, Settings → 設定, Brews(履歴) → 抽出履歴
      - 略語・単位・技術用語で**英語表記が標準**の語 → 英語のまま
        例: TDS, EBF, EY, pH, ppm, °C, g, ml, bar, rpm
      - UI 上の慣用表現 → Apple/Google 日本語ガイドラインに準拠
        例: OK / キャンセル / 保存 / 削除 / 編集 / 共有

- [ ] **A-2. 用語集を `docs/i18n/ja-glossary.md` (新規) として保存**
      各キーで採用した訳語と判断理由を記録。レビュー & 後続翻訳の一貫性担保のため。

- [ ] **A-3. 文体ルール策定**
      - 基本: 「です・ます」調の丁寧語、句読点は「、。」。
      - 半角/全角ルール: 英数字は半角、カタカナと日本語の間にスペースを入れない。
      - 動詞ボタン形: 「保存」「削除」「追加」「キャンセル」など体言止め系を統一。
      - プレースホルダ (`{{value}}`, `%s` 等) はそのまま保持。
      - 既存 JSON の改行 `\n` / HTML タグ (`<br>`, `<b>` 等) はそのまま保持。

### フェーズ B: 翻訳ファイル追加

- [ ] **B-1. `src/assets/i18n/ja.json` を新規作成**
      ベースは `src/assets/i18n/en.json` をコピーし、全キーを和訳する。
      - 既存の他言語ファイル（de.json 等）とキーセットが完全に一致していることを確認するスクリプト/目視チェック。
      - 翻訳量 (≈1,500 キー) を以下のグループ単位で進める:
        1. ナビゲーション/共通 (`NAV_*`, `CANCEL`, `SAVE`, `DELETE` など)
        2. 設定 (`PAGE_SETTINGS_*`)
        3. 豆 (`BEANS_*`, `PAGE_BEANS_*`)
        4. 抽出 (`BREW_*`, `PAGE_BREWS_*`, `BREW_DATA_*`)
        5. グラインダー / ミル (`MILL_*`)
        6. 抽出方法 (`PREPARATION_*`)
        7. 水 (`WATER_*`)
        8. 焙煎 / 生豆 (`ROAST_*`, `GREEN_BEAN_*`)
        9. グラフ / 統計 (`GRAPH_*`, `STATISTIC_*`)
        10. 情報系 / その他 (`PAGE_*_INFO`, `HELP_*`, `LOGS`, `LICENCES` など)

- [ ] **B-2. 言語名キー追加**
      `PAGE_SETTINGS_LANGUAGE_JAPANESE` を全 JSON に追加（各国語表記: 英語=Japanese, ドイツ語=Japanisch, 日本語=日本語 など。最低限 en/ja は対応、他言語は英語フォールバックでも可）。

### フェーズ C: アプリ側組み込み

- [ ] **C-1. 設定画面の言語選択肢に日本語を追加**
      `src/app/settings/settings.page.html` の `<ion-select>` に
      `<ion-select-option value="ja">{{ "PAGE_SETTINGS_LANGUAGE_JAPANESE" | translate }}</ion-select-option>` を追加。

- [ ] **C-2. OS 言語自動判定に `ja` 分岐を追加**
      `src/app/app.component.ts` の `__setDeviceLanguage()` 内 `if/else` ブロックに `systemLanguage === 'ja'` の分岐を追加。

- [ ] **C-3. `moment` 日本語ロケールの読み込み**
      `src/services/uiHelper.ts` に `import 'moment/locale/ja';` を追加（`de` と並列）。
      ※ 日付フォーマットが日本語で表示されるか実機/ブラウザで確認。

- [ ] **C-4. 他に locale 依存している箇所の確認**
      - `registerLocaleData` の使用有無（grep 済み: 現状未使用）。
      - 数値/通貨/日時パイプ (`DatePipe` 等) がカスタムロケール指定を持っていないか念のため確認。

### フェーズ D: 検証

- [ ] **D-1. ビルド確認**
      `pnpm install` → `pnpm run build`（または既存の `package.json` スクリプト）で TS/Angular ビルドが通ることを確認。

- [ ] **D-2. Lint / フォーマット**
      既存の `eslint` / `prettier` / `stylelint` 設定に違反がないか確認（JSON 整形を含む）。

- [ ] **D-3. 単体テスト**
      `pnpm test` 等、既存テストを実行し回帰がないことを確認。
      特に `src/services/aiBeanImport/__tests__/ai-import-examples.service.spec.ts` 等、言語リストを参照しているテストの影響有無を確認。

- [ ] **D-4. 動作確認 (手動)**
      - 設定 > 言語 で「日本語」を選択 → 全画面の主要ラベルが日本語になる。
      - OS 言語が日本語の状態で初回起動 → 自動で `ja` が選ばれる。
      - 日付/時刻表示が日本語ロケールになる (`moment`)。
      - 文字あふれ / 折り返し崩れがないか主要画面でチェック (Home / Brew Add / Bean Add / Settings / Statistics / Graph)。

### フェーズ E: 仕上げ

- [ ] **E-1. README / DEVELOPING.md への追記 (必要なら)**
      対応言語に「日本語 (ja)」を追加し、用語集 (`docs/i18n/ja-glossary.md`) へのリンクを記載。

- [ ] **E-2. PR 作成 (フォーク内)**
      タイトル例: `feat(i18n): add Japanese (ja) localization`
      本文: 用語集の方針サマリ、対応キー数、未訳キーがある場合はその一覧、スクリーンショット。

- [ ] **E-3. 作業内容のレビュー依頼**

---

## 2. 確認事項

以下、進める上で判断を確認したい点です。

[Question 1] アプリ内で**未訳キーが残った場合のフォールバック**は英語 (`en`) で問題ないでしょうか？
[Answer 1] はい、OK。ngx-translate の標準挙動 (`en` フォールバック) とする。

[Question 2] **用語集 (glossary)** を `docs/i18n/ja-glossary.md` としてコミットしてよいですか？
[Answer 2] OK（後で削除する可能性あり）。

[Question 3] 翻訳のスコープ・優先度について。
[Answer 3] 特に優先指定なし。トークン上限を考慮し**グループ単位で分割コミット**する。

[Question 4] 主要用語の方針:
- Brews (一覧) → 抽出履歴 / Brew (動作) → 抽出
- Beans → 豆
- Methods (Preparation) → 抽出方法
- Grinders (Mill) → グラインダー
- Water → 水 / Statistics → 統計
- Cupping → カッピング / Bloom → 蒸らし
- TDS / EBF / EY → 英語のまま
[Answer 4] 承認。

[Question 5] アプリ名 "Beanconqueror" は英字のまま。
[Answer 5] 承認。

---

## 3. ステータス

計画は **承認済み** (2026-04-26)。フェーズ A から実装に着手する。
