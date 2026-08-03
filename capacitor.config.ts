import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.fin',
  appName: 'Fin',
  webDir: 'capacitor-www',
  server: {
    url: 'https://fin-app.xyz',
    cleartext: false,
  },
  ios: {
    // Web 側が読み込まれるまでの下地。ここは 1 色しか持てないので、
    // globals.css の :root（＝テーマ未指定時のライト）の背景に合わせる。
    // 以前はダーク固定だったため、ライト表示の利用者は起動時に一瞬黒が見えていた。
    backgroundColor: '#f5f3ef',
    contentInset: 'never',
  },
};

export default config;
