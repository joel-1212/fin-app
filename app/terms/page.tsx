import styles from "@/app/legal/legal.module.css";

export default function TermsPage() {
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

      <article className={styles.article} aria-labelledby="terms-title">
        <header className={styles.articleHeader}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            LEGAL
          </p>
          <h1 id="terms-title">利用規約</h1>
          <p className={styles.date}>制定日: 2026年8月2日</p>
        </header>

        <div className={styles.prose}>
          <p>この利用規約(以下「本規約」)は、個人開発者(以下「運営者」)が提供するタスク管理アプリケーション「Fin」(以下「本サービス」)の利用条件を定めるものです。利用者は、本サービスを利用することで本規約に同意したものとみなします。</p>

          <section aria-labelledby="terms-nature">
            <h2 id="terms-nature">1. サービスの性質</h2>
            <p>本サービスは、運営者が提供するタスク管理アプリケーションです。運営者は、予告なく機能の変更、追加、削除、または本サービス自体の提供の中断・終了を行うことがあります。</p>
          </section>

          <section aria-labelledby="terms-disclaimer">
            <h2 id="terms-disclaimer">2. 免責事項</h2>
            <ul>
              <li>本サービスが表示する「終わる予定時刻」等の情報は、利用者が入力した所要時間に基づく目安であり、その正確性・完全性を保証するものではありません。</li>
              <li>運営者は、本サービスの利用により利用者に生じたいかなる損害についても、法令で認められる範囲で責任を負いません。</li>
              <li>本サービスは医学的な診断・治療を目的としたものではなく、医療行為の代替となるものではありません。健康上の懸念がある場合は、医療専門家にご相談ください。</li>
            </ul>
          </section>

          <section aria-labelledby="terms-prohibited">
            <h2 id="terms-prohibited">3. 禁止事項</h2>
            <p>利用者は、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
            <ul>
              <li>本サービスのソースコードの不正な複製、改変、リバースエンジニアリング</li>
              <li>有料プランの機能制限を回避する行為、およびそのための手段を第三者に提供する行為</li>
              <li>本サービスまたはサーバーに過度な負荷をかける行為</li>
              <li>法令または公序良俗に違反する行為</li>
              <li>他の利用者または第三者の権利を侵害する行為</li>
            </ul>
            <p>これらの違反が確認された場合、運営者は本サービスの利用の停止その他必要な措置を取ることがあります。</p>
          </section>

          <section aria-labelledby="terms-intellectual-property">
            <h2 id="terms-intellectual-property">4. 知的財産権</h2>
            <p>本サービスに関するコンテンツ、デザイン、ロゴ等の知的財産権は、運営者または正当な権利者に帰属します。</p>
          </section>

          <section aria-labelledby="terms-changes">
            <h2 id="terms-changes">5. 規約の変更</h2>
            <p>運営者は、必要と判断した場合、本規約を予告なく変更できるものとします。変更後の規約は、本サービス上に掲示された時点から効力を生じます。</p>
          </section>

          <section aria-labelledby="terms-governing-law">
            <h2 id="terms-governing-law">6. 準拠法・管轄</h2>
            <p>本規約の解釈にあたっては日本法を準拠法とし、本サービスに関して紛争が生じた場合には、運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。</p>
          </section>

          <section aria-labelledby="terms-contact">
            <h2 id="terms-contact">7. お問い合わせ</h2>
            <p>本規約に関するお問い合わせは、以下までご連絡ください。</p>
            <p className={styles.contact}>musicdnaofficial@gmail.com</p>
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
