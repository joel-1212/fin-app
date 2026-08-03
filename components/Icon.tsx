type Props = {
  /** Material Symbols のリガチャ名 */
  name: string;
  size?: number;
  /** 0 で線画、1 で塗り。完了時に 1 へ動かすと滑らかに変化する */
  fill?: number;
  weight?: number;
  color?: string;
  opacity?: number;
};

export function Icon({ name, size = 24, fill = 0, weight = 300, color, opacity }: Props) {
  return (
    <span
      className="icon"
      aria-hidden
      style={{
        fontSize: size,
        width: size,
        height: size,
        color,
        opacity,
        ["--icon-fill" as string]: fill,
        ["--icon-weight" as string]: weight,
      }}
    >
      {name}
    </span>
  );
}
