import styles from "@/app/legal/legal.module.css";

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.noise} aria-hidden="true" />

      <header className={styles.header}>
        <a className={styles.brand} href="/landing" aria-label="Finのランディングページへ">
          <span className={styles.brandMark} aria-hidden="true">
            f
          </span>
          <span>Fin</span>
        </a>
        <a className={styles.headerLink} href="/landing">
          ランディングページへ
        </a>
      </header>

      <article className={styles.article} aria-labelledby="privacy-title">
        <header className={styles.articleHeader}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            LEGAL
          </p>
          <h1 id="privacy-title">プライバシーポリシー</h1>
          <p className={styles.date}>制定日: 2026年8月2日 / 最終改定日: 2026年9月3日</p>
        </header>

        <div className={styles.prose}>
          <p>Fin(以下「本サービス」)は、個人開発者(以下「運営者」)が開発・運営するタスク管理アプリケーション(iOS版アプリケーションおよびWeb版ランディングページ)です。本ポリシーは、本サービスにおける利用者情報の取り扱いについて説明します。</p>

          <section aria-labelledby="privacy-collection">
            <h2 id="privacy-collection">1. 収集する情報</h2>
            <p>利用者のタスクデータ(タスク名、所要時間、完了の記録、テンプレート、表示設定など)は、お使いの端末・ブラウザ内のストレージにのみ保存されます。運営者はこれらのデータを保持するサーバーを持たず、これらが運営者に送信されることはありません。アプリを終了しても保存された内容は残り、端末内のデータを消去するまで保持されます。</p>
            <p>アカウントの作成やサインインは必要ありません。本サービスは広告トラッキングやCookieによる利用者識別を導入していません。利用状況の送信は、次項の初回アンケートに限られます。</p>
          </section>

          <section aria-labelledby="privacy-survey">
            <h2 id="privacy-survey">1-2. 初回アンケート(利用状況の集計)について</h2>
            <p>初回起動時に「このアプリをどこで知ったか」を1回だけお聞きします。選んだ項目とアプリ名、端末の種類(iOS / Web)、アプリの版、日付のみを、運営者の集計用スプレッドシート(Google LLC が提供するサービス上)に送信します。端末の識別子・氏名・メールアドレス・位置情報などの個人を特定する情報は送信しません。</p>
            <p>回答は任意です。「答えずに始める」を選ぶと何も送信されません。集計はアプリの告知先を決める目的にのみ使い、第三者に提供しません。</p>
          </section>

          <section aria-labelledby="privacy-purchase">
            <h2 id="privacy-purchase">2. 有料プラン(Fin Pro)の購入について</h2>
            <p>有料プランを購入・復元する場合に限り、購入処理のために RevenueCat, Inc. が提供するサービスを利用します。この際、購入・サブスクリプションの状況と、本サービスが自動的に発行する匿名の識別子が RevenueCat のサーバーへ送信されます。氏名やメールアドレスなど、利用者を特定する情報は送信しません。タスクの内容が送信されることもありません。</p>
            <p>お支払い情報(クレジットカード番号等)は Apple 社が取り扱い、運営者が受け取ることも参照することもできません。</p>
            <p>RevenueCat のプライバシーポリシーは <a href="https://www.revenuecat.com/privacy/">https://www.revenuecat.com/privacy/</a> をご確認ください。</p>
          </section>

          <section aria-labelledby="privacy-future">
            <h2 id="privacy-future">3. 将来的な機能追加について</h2>
            <p>アカウント機能やアクセス解析などを追加する場合は、実装前に本ポリシーを更新し、追加される情報の種類と用途を明示します。</p>
          </section>

          <section aria-labelledby="privacy-appstore">
            <h2 id="privacy-appstore">4. App Storeについて</h2>
            <p>iOS版はApple社のApp Storeを通じて配布されます。App Storeやオペレーティングシステムを通じて、Apple社が独自にクラッシュログ・診断データ・デバイス情報等を収集する場合があります(利用者がiOSの設定で許可した範囲)。これはApple社のプライバシーポリシーに基づくものであり、運営者が収集・管理するものではありません。</p>
          </section>

          <section aria-labelledby="privacy-third-party">
            <h2 id="privacy-third-party">5. 第三者への情報提供</h2>
            <p>運営者は、上記1-2に記載した集計用サービスへの送信および上記2に記載した購入処理の場合を除き、利用者の情報を第三者に提供することはありません(法令に基づく場合を除きます)。</p>
          </section>

          <section aria-labelledby="privacy-medical">
            <h2 id="privacy-medical">6. 医療に関する免責</h2>
            <p>本サービスは、ADHD傾向、先延ばし、時間管理に困りごとがある方の生活支援を目的とした一般的なツールであり、医学的な診断・治療・症状の改善を目的としたものではありません。本サービスの利用が医療行為に代わるものではないことをご理解の上、ご利用ください。</p>
          </section>

          <section aria-labelledby="privacy-contact">
            <h2 id="privacy-contact">7. お問い合わせ</h2>
            <p>本ポリシーに関するお問い合わせは、以下までご連絡ください。</p>
            <p className={styles.contact}>musicdnaofficial@gmail.com</p>
          </section>

          <section aria-labelledby="privacy-revision">
            <h2 id="privacy-revision">8. 改定について</h2>
            <p>本ポリシーの内容は、事前の予告なく変更されることがあります。重要な変更がある場合は、本サービス上で告知します。</p>
          </section>
        </div>
      </article>

      <footer className={styles.footer}>
        <a className={styles.brand} href="/landing" aria-label="Finのランディングページへ">
          <span className={styles.brandMark} aria-hidden="true">
            f
          </span>
          <span>Fin</span>
        </a>
        <div className={styles.footerMeta}>
          <p>毎日のタスクと時間を、見える形に。</p>
          <nav className={styles.footerLinks} aria-label="法的情報">
            <a href="/privacy">プライバシー</a>
            <a href="/terms">利用規約</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
