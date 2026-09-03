import styles from "@/app/landing/landing.module.css";

// 2026-08-14 に App Store で公開されたため、実ページへのリンクを出す。
// 公開の実測確認は docs/launch-2026-08-14.md に記録がある。
const appStoreUrl: string | null = "https://apps.apple.com/jp/app/fin/id6797369393";

const tasks = [
  { name: "企画のメモを整える", duration: "25分", color: "coral" },
  { name: "メールを返す", duration: "15分", color: "lavender" },
  { name: "買い物リストをつくる", duration: "10分", color: "mint" },
] as const;

const steps = [
  {
    number: "01",
    title: "いまの感覚で、時間を入れる",
    body: "完璧に当てなくて大丈夫。タスクごとに、かかりそうな時間を入れます。",
  },
  {
    number: "02",
    title: "合計時間を、ひと目で見る",
    body: "積み上がった分数が、今日の予定を考えるための小さな手がかりになります。",
  },
  {
    number: "03",
    title: "終わる見込みを、そっと知る",
    body: "残りのタスクがいつ頃終わりそうかを見て、次の予定を選びやすくします。",
  },
] as const;

export function LandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.noise} aria-hidden="true" />

      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Fin の紹介ページの先頭へ">
          <span className={styles.brandMark} aria-hidden="true">
            f
          </span>
          <span>Fin</span>
        </a>

        {appStoreUrl ? (
          <a
            className={styles.headerCta}
            href={appStoreUrl}
            target="_blank"
            rel="noreferrer"
          >
            App Storeで見る
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className={styles.headerCta} aria-disabled="true">
            App Storeで公開予定
            <span aria-hidden="true">↗</span>
          </span>
        )}
      </header>

      <section className={styles.hero} id="top" aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            Fin for iPhone
          </p>
          <h1 id="hero-title">
            タスクごとの
            <br />
            見込み時間を入れる。
            <br />
            <em>全部終わる時刻</em>が見える。
          </h1>
          <p className={styles.lead}>
            所要時間を入れると終わる時刻が見通せるタスク管理アプリです。やることが多い日も、Finは各タスクの見込み時間を合計し、すべて終わる時刻の目安を表示します。
          </p>

          <div className={styles.heroActions}>
            {appStoreUrl ? (
              <a
                className={styles.primaryCta}
                href={appStoreUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>App Storeで見る</span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </a>
            ) : (
              <span className={styles.primaryCta} aria-disabled="true">
                <span>App Storeで公開予定</span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </span>
            )}
            <p className={styles.ctaNote}>iOS版はApp Storeで公開中です。ブラウザ版はこのままお使いいただけます。</p>
          </div>
        </div>

        <div className={styles.previewWrap} aria-label="Fin アプリの表示イメージ">
          <div className={styles.sunGlow} aria-hidden="true" />
          <div className={styles.phone}>
            <div className={styles.phoneTop}>
              <span>9:41</span>
              <span className={styles.dynamicIsland} aria-hidden="true" />
              <span className={styles.signal} aria-hidden="true">
                ◔
              </span>
            </div>

            <div className={styles.phoneBody}>
              <div className={styles.phoneHeader}>
                <div>
                  <p>水曜日、8月2日</p>
                  <h2>今日のこと</h2>
                </div>
                <span className={styles.avatar} aria-hidden="true">
                  f
                </span>
              </div>

              <div className={styles.finishCard}>
                <span>すべて終わる見込み</span>
                <strong>15:10</strong>
                <p>あと 50分 <i aria-hidden="true">•</i> いま 14:20</p>
              </div>

              <div className={styles.taskLabel}>
                <span>今日のタスク</span>
                <span>3件 / 50分</span>
              </div>

              <ul className={styles.taskList}>
                {tasks.map((task) => (
                  <li key={task.name}>
                    <span className={`${styles.taskCheck} ${styles[task.color]}`} aria-hidden="true" />
                    <span className={styles.taskName}>{task.name}</span>
                    <span className={styles.taskDuration}>{task.duration}</span>
                  </li>
                ))}
              </ul>

              <button className={styles.addTask} type="button" aria-label="タスクを追加する表示例">
                <span aria-hidden="true">＋</span>
                タスクを追加
              </button>
            </div>

            <div className={styles.homeIndicator} aria-hidden="true" />
          </div>
          <p className={styles.previewCaption}>時間を「見えること」に変える、Finの画面イメージ</p>
        </div>
      </section>

      <section className={styles.reassurance} aria-labelledby="reassurance-title">
        <p className={styles.sectionLabel}>A GENTLER WAY TO PLAN</p>
        <h2 id="reassurance-title">
          先延ばししてしまう日も、
          <br />
          自分を責める前に、時間を見よう。
        </h2>
        <p>
          ADHD傾向がある方、先延ばししやすい方、時間管理に困りごとがある方へ。Finは、毎日のタスクと時間の関係を落ち着いて見渡すための道具です。表示される時刻は、入力した時間から計算した目安です。
        </p>
      </section>

      <section className={styles.steps} aria-labelledby="steps-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionLabel}>HOW FIN WORKS</p>
          <h2 id="steps-title">「あとどれくらい？」を、<br />静かな見通しに。</h2>
        </div>

        <ol className={styles.stepList}>
          {steps.map((step) => (
            <li key={step.number}>
              <span className={styles.stepNumber}>{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.finalCta} aria-labelledby="app-store-title">
        <div className={styles.finalOrb} aria-hidden="true" />
        <p className={styles.sectionLabel}>APP STORE RELEASE</p>
        <h2 id="app-store-title">今日の終わりを、<br />もう少し見渡しやすく。</h2>
        <p>iOS版Finは、App Storeで公開中です。</p>
        {appStoreUrl ? (
          <a href={appStoreUrl} target="_blank" rel="noreferrer" className={styles.finalCtaLink}>
            App Storeで見る
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className={styles.finalCtaLink} aria-disabled="true">
            App Storeで公開予定
            <span aria-hidden="true">↗</span>
          </span>
        )}
      </section>

      <footer className={styles.footer}>
        <a className={styles.brand} href="#top" aria-label="ページの先頭へ">
          <span className={styles.brandMark} aria-hidden="true">
            f
          </span>
          <span>Fin</span>
        </a>
        <p>
          毎日のタスクと時間を、見える形に。{" "}
          <a href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>
            プライバシー
          </a>
          <span aria-hidden="true"> · </span>
          <a href="/terms" style={{ color: "inherit", textDecoration: "none" }}>
            利用規約
          </a>
        </p>
      </footer>
    </main>
  );
}
