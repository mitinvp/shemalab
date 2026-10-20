import { Box, C, Dot, Ln, Pl, Svg, Txt } from "./figure-kit";

// ── t19: ієрархія памʼяті ─────────────────────────────────────────────────
export function MemoryPyramid() {
  const layers = [
    ["Регістри", "байти · менше 1 нс"],
    ["Кеш", "КБ–МБ · 1–10 нс"],
    ["ОЗП", "ГБ · ≈50–100 нс"],
    ["SSD / HDD", "ТБ · десятки мкс – мс"],
  ];
  const cx = 280;
  return (
    <Svg w={820} h={380} label="Ієрархія памʼяті комп'ютера">
      <Txt x={560} y={22} anchor="start" size={12} fill={C.muted}>Ємність і час доступу (порядок величин)</Txt>
      {layers.map(([n, d], j) => {
        const y = 36 + j * 80;
        const tw = 70 + j * 120;
        const bw = 70 + (j + 1) * 120;
        return (
          <g key={n}>
            <polygon
              points={`${cx - tw / 2},${y} ${cx + tw / 2},${y} ${cx + bw / 2},${y + 72} ${cx - bw / 2},${y + 72}`}
              fill={j === 0 ? C.sigDim : C.surf}
              stroke={j === 0 ? C.sig : C.fg}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
            <Txt x={cx} y={y + 44} size={j === 0 ? 13 : 15} weight={700}>{n}</Txt>
            <Ln x1={cx + bw / 2 + 6} y1={y + 36} x2={550} y2={y + 36} color={C.border} dash="3 4" w={1} />
            <Txt x={560} y={y + 41} anchor="start" size={14}>{d}</Txt>
          </g>
        );
      })}
      <Txt x={560} y={348} anchor="start" size={12} fill={C.sig}>↑ вгорі: швидше й дорожче</Txt>
      <Txt x={560} y={366} anchor="start" size={12} fill={C.muted}>↓ внизу: більше й дешевше за біт</Txt>
    </Svg>
  );
}

// ── t20: кеш між процесором і ОЗП ─────────────────────────────────────────
export function CacheDiagram() {
  return (
    <Svg w={780} h={270} label="Кеш-памʼять між процесором і ОЗП">
      <Box x={30} y={70} w={120} h={90} label="Процесор" />
      <Box x={330} y={70} w={130} h={90} label="Кеш" sub="SRAM" hot />
      <Box x={630} y={70} w={120} h={90} label="ОЗП" sub="DRAM" />
      <Ln x1={150} y1={95} x2={330} y2={95} arrow />
      <Txt x={240} y={86} size={12} fill={C.muted}>запит за адресою</Txt>
      <Ln x1={330} y1={135} x2={150} y2={135} color={C.sig} arrow />
      <Txt x={240} y={156} size={12} fill={C.sig}>hit: дані з кешу (швидко)</Txt>
      <Ln x1={460} y1={95} x2={630} y2={95} arrow />
      <Txt x={545} y={86} size={12} fill={C.muted}>miss: запит до ОЗП</Txt>
      <Ln x1={630} y1={135} x2={460} y2={135} arrow />
      <Txt x={545} y={156} size={12} fill={C.muted}>блок даних → у кеш</Txt>
      <Txt x={390} y={215} size={13}>Кеш зберігає копії даних, до яких процесор звертається найчастіше</Txt>
      <Txt x={390} y={238} size={12} fill={C.muted}>(принцип локальності: близькі за адресою й часом звернення)</Txt>
    </Svg>
  );
}

// ── t21: структура процесора та шини ──────────────────────────────────────
export function CpuBlocks() {
  const buses: [string, number][] = [["Шина адреси", 255], ["Шина даних", 280], ["Шина керування", 305]];
  return (
    <Svg w={880} h={330} label="Структурна схема мікропроцесорної системи">
      <rect x={20} y={20} width={380} height={200} rx={10} fill="none" stroke={C.fg} strokeWidth={1.8} strokeDasharray="8 5" />
      <Txt x={34} y={40} anchor="start" size={13} fill={C.muted}>Процесор</Txt>
      <Box x={40} y={55} w={170} h={60} label="Пристрій керування" sub="PC, IR" />
      <Box x={230} y={55} w={150} h={60} label="АЛП" sub="+  −  І  АБО" />
      <Box x={40} y={135} w={340} h={65} label="Регістри" sub="загального призначення, прапорців SR, стека SP" />
      <Box x={430} y={60} w={140} h={90} label="Памʼять" sub="програма + дані" />
      <Box x={590} y={60} w={140} h={90} label="Вхід / вихід" sub="пристрої" />
      {buses.map(([n, y]) => (
        <g key={n}>
          <Ln x1={20} y1={y} x2={740} y2={y} w={2.6} color={C.accent} />
          <Txt x={752} y={y + 5} anchor="start" size={12} fill={C.muted}>{n}</Txt>
        </g>
      ))}
      {[80, 120, 160].map((x, i) => (
        <g key={x}>
          <Ln x1={x} y1={220} x2={x} y2={buses[i]![1]} />
          <Dot x={x} y={buses[i]![1]} />
        </g>
      ))}
      {[450, 490, 530].map((x, i) => (
        <g key={x}>
          <Ln x1={x} y1={150} x2={x} y2={buses[i]![1]} />
          <Dot x={x} y={buses[i]![1]} />
        </g>
      ))}
      {[610, 650, 690].map((x, i) => (
        <g key={x}>
          <Ln x1={x} y1={150} x2={x} y2={buses[i]![1]} />
          <Dot x={x} y={buses[i]![1]} />
        </g>
      ))}
    </Svg>
  );
}

// ── t21: архітектури фон Неймана та Гарвардська ───────────────────────────
export function Architectures() {
  return (
    <Svg w={820} h={260} label="Архітектури фон Неймана та Гарвардська">
      <Txt x={200} y={26} size={14} weight={700}>Фон Неймана</Txt>
      <Box x={40} y={90} w={110} h={70} label="Процесор" />
      <Box x={250} y={90} w={130} h={70} label="Памʼять" sub="команди + дані" />
      <Ln x1={150} y1={125} x2={250} y2={125} both />
      <Txt x={200} y={115} size={12} fill={C.muted}>одна шина</Txt>
      <Txt x={200} y={205} size={12} fill={C.muted}>спільна памʼять — команди й дані</Txt>
      <Txt x={200} y={223} size={12} fill={C.muted}>конкурують за одну шину</Txt>

      <Ln x1={410} y1={20} x2={410} y2={240} color={C.border} dash="4 5" w={1} />

      <Txt x={620} y={26} size={14} weight={700}>Гарвардська (AVR)</Txt>
      <Box x={440} y={90} w={110} h={70} label="Процесор" />
      <Box x={650} y={50} w={140} h={60} label="Памʼять програм" sub="Flash" />
      <Box x={650} y={140} w={140} h={60} label="Памʼять даних" sub="SRAM" />
      <Ln x1={550} y1={115} x2={650} y2={80} both />
      <Ln x1={550} y1={135} x2={650} y2={170} both />
      <Txt x={620} y={225} size={12} fill={C.muted}>окремі памʼять і шини — команди й дані</Txt>
      <Txt x={620} y={243} size={12} fill={C.muted}>читаються одночасно</Txt>
    </Svg>
  );
}

// ── t22: структура мікроконтролера AVR ─────────────────────────────────────
export function AvrBlocks() {
  const left: [string, string, number, number][] = [
    ["Ядро AVR", "АЛП · 32 регістри · PC", 80, 70],
    ["Flash 32 КБ", "памʼять програми", 165, 55],
    ["SRAM 2 КБ", "змінні, стек", 235, 55],
    ["EEPROM 1 КБ", "налаштування", 305, 50],
  ];
  const right: [string, string, number, number][] = [
    ["Порти B, C, D", "цифрові й аналогові лінії", 80, 55],
    ["Таймери / лічильники", "T0, T1, T2 · ШІМ", 150, 55],
    ["АЦП 10 біт", "6 каналів", 220, 55],
    ["UART · SPI · I²C", "інтерфейси звʼязку", 290, 55],
  ];
  return (
    <Svg w={760} h={400} label="Структура мікроконтролера ATmega328P">
      <rect x={20} y={50} width={720} height={320} rx={12} fill="none" stroke={C.fg} strokeWidth={2} />
      <Txt x={380} y={42} size={15} weight={700}>ATmega328P</Txt>
      <Txt x={380} y={72} size={11} fill={C.muted}>внутрішня шина</Txt>
      <Ln x1={380} y1={78} x2={380} y2={350} w={4} color={C.accent} />
      {left.map(([n, s, y, h]) => (
        <g key={n}>
          <Box x={50} y={y} w={250} h={h} label={n} sub={s} />
          <Ln x1={300} y1={y + h / 2} x2={380} y2={y + h / 2} />
          <Dot x={380} y={y + h / 2} />
        </g>
      ))}
      {right.map(([n, s, y, h]) => (
        <g key={n}>
          <Box x={460} y={y} w={250} h={h} label={n} sub={s} />
          <Ln x1={460} y1={y + h / 2} x2={380} y2={y + h / 2} />
          <Dot x={380} y={y + h / 2} />
        </g>
      ))}
      <Txt x={380} y={392} size={12} fill={C.muted}>Кварц 16 МГц · живлення 5 В</Txt>
    </Svg>
  );
}

// ── t23: структура скетча Arduino ──────────────────────────────────────────
export function SketchFlow() {
  return (
    <Svg w={620} h={380} label="Структура скетча Arduino: setup() і loop()">
      <ellipse cx={280} cy={32} rx={90} ry={20} fill={C.surf} stroke={C.fg} strokeWidth={1.8} />
      <Txt x={280} y={37} size={13} weight={600}>Живлення / Reset</Txt>
      <Ln x1={280} y1={52} x2={280} y2={88} arrow />
      <rect x={130} y={88} width={300} height={80} rx={8} fill={C.surf} stroke={C.fg} strokeWidth={1.8} />
      <Txt x={280} y={112} size={16} weight={700}>setup()</Txt>
      <Txt x={280} y={134} size={12} fill={C.muted}>виконується один раз</Txt>
      <Txt x={280} y={154} size={12} mono>pinMode(13, OUTPUT);</Txt>
      <Ln x1={280} y1={168} x2={280} y2={206} arrow />
      <rect x={130} y={206} width={300} height={136} rx={8} fill={C.sigDim} stroke={C.sig} strokeWidth={1.8} />
      <Txt x={280} y={230} size={16} weight={700}>loop()</Txt>
      <Txt x={280} y={250} size={12} fill={C.muted}>повторюється без кінця</Txt>
      <Txt x={280} y={274} size={12} mono>digitalWrite(13, HIGH);</Txt>
      <Txt x={280} y={292} size={12} mono>delay(500);</Txt>
      <Txt x={280} y={310} size={12} mono>digitalWrite(13, LOW);</Txt>
      <Txt x={280} y={328} size={12} mono>delay(500);</Txt>
      <Pl pts={[[430, 300], [500, 300], [500, 190], [390, 190], [390, 206]]} arrow />
      <Txt x={510} y={250} anchor="start" size={12} fill={C.sig}>знову</Txt>
      <Txt x={510} y={268} anchor="start" size={12} fill={C.sig}>і знову</Txt>
    </Svg>
  );
}

// ── t24: розташування виводів Arduino Uno ─────────────────────────────────
export function UnoPins() {
  const dA = ["13", "12", "~11", "~10", "~9", "8"];
  const dB = ["7", "~6", "~5", "4", "~3", "2", "1", "0"];
  const power = ["IOREF", "RESET", "3,3V", "5V", "GND", "GND", "Vin"];
  const analog = ["A0", "A1", "A2", "A3", "A4", "A5"];
  const pin = (x: number, y: number, label: string, kind: "plain" | "pwm" | "uart" | "i2c" | "power", below?: boolean) => {
    const fill = kind === "pwm" ? C.sigDim : C.surf;
    const stroke = kind === "pwm" ? C.sig : kind === "uart" ? C.danger : kind === "i2c" ? C.accent : C.fg;
    return (
      <g key={`${x}-${y}`}>
        <rect x={x - 11} y={y} width={22} height={22} rx={3} fill={fill} stroke={stroke} strokeWidth={kind === "plain" || kind === "power" ? 1.5 : 2.4} />
        <Txt x={x} y={below ? y + 38 : y - 8} size={11} fill={C.fg}>{label}</Txt>
      </g>
    );
  };
  return (
    <Svg w={800} h={390} label="Розташування виводів плати Arduino Uno">
      <rect x={20} y={20} width={760} height={350} rx={14} fill="none" stroke={C.fg} strokeWidth={2} />
      <rect x={20} y={80} width={80} height={64} fill={C.surf} stroke={C.fg} strokeWidth={1.8} />
      <Txt x={60} y={116} size={12}>USB</Txt>
      <rect x={20} y={240} width={80} height={64} fill={C.surf} stroke={C.fg} strokeWidth={1.8} />
      <Txt x={60} y={276} size={12}>Живлення</Txt>
      <Box x={320} y={165} w={170} h={64} label="ATmega328P" sub="16 МГц · 5 В" />
      <Txt x={430} y={42} size={12} fill={C.muted}>Цифрові піни</Txt>
      {dA.map((l, i) => pin(250 + i * 31, 70, l, l.startsWith("~") ? "pwm" : "plain"))}
      {dB.map((l, i) => pin(470 + i * 31, 70, l, i >= 6 ? "uart" : l.startsWith("~") ? "pwm" : "plain"))}
      <Txt x={281} y={112} size={11} fill={C.muted}>D13 = LED, SPI: 10–13</Txt>
      <Txt x={686} y={112} size={11} fill={C.danger}>TX / RX</Txt>
      <Txt x={270} y={278} anchor="end" size={12} fill={C.muted}>Живлення</Txt>
      {power.map((l, i) => pin(280 + i * 44, 290, l, "power", true))}
      <Txt x={560} y={282} anchor="start" size={12} fill={C.muted}>Аналогові входи</Txt>
      {analog.map((l, i) => pin(590 + i * 34, 290, l, i >= 4 ? "i2c" : "plain", true))}
      <Txt x={640} y={356} size={11} fill={C.accent}>A4 = SDA, A5 = SCL (I²C)</Txt>
      <rect x={30} y={326} width={12} height={12} fill={C.sigDim} stroke={C.sig} strokeWidth={2} />
      <Txt x={48} y={337} anchor="start" size={12} fill={C.muted}>~ ШІМ (3, 5, 6, 9, 10, 11)</Txt>
      <rect x={30} y={346} width={12} height={12} fill={C.surf} stroke={C.danger} strokeWidth={2} />
      <Txt x={48} y={357} anchor="start" size={12} fill={C.muted}>UART (0, 1)</Txt>
    </Svg>
  );
}

// ── t25: автомат-світлофор (граф станів) ──────────────────────────────────
export function FsmTraffic() {
  const states: [string, string, number, number][] = [
    ["Червоний", "R=1  Y=0  G=0", 150, 110],
    ["Зелений", "R=0  Y=0  G=1", 490, 110],
    ["Жовтий", "R=0  Y=1  G=0", 320, 290],
  ];
  return (
    <Svg w={640} h={390} label="Граф станів автомата-світлофора">
      {states.map(([n, o, x, y]) => (
        <g key={n}>
          <circle cx={x} cy={y} r={54} fill={C.surf} stroke={C.fg} strokeWidth={2} />
          <Txt x={x} y={y - 2} size={15} weight={700}>{n}</Txt>
          <Txt x={x} y={y + 18} size={11} mono fill={C.muted}>{o}</Txt>
        </g>
      ))}
      <Ln x1={40} y1={110} x2={94} y2={110} arrow />
      <Txt x={40} y={98} anchor="start" size={12} fill={C.muted}>старт</Txt>
      <Ln x1={206} y1={110} x2={434} y2={110} arrow />
      <Txt x={320} y={98} size={13} fill={C.sig}>минуло 30 с</Txt>
      <Ln x1={454} y1={152} x2={357} y2={250} arrow />
      <Txt x={440} y={206} anchor="start" size={13} fill={C.sig}>минуло 25 с</Txt>
      <Ln x1={283} y1={250} x2={186} y2={152} arrow />
      <Txt x={200} y={206} anchor="end" size={13} fill={C.sig}>минуло 5 с</Txt>
      <Txt x={320} y={372} size={12} fill={C.muted}>Автомат Мура: виходи (кольори) визначає лише поточний стан</Txt>
    </Svg>
  );
}

// ── t25: структура автомата (Мілі / Мура) ─────────────────────────────────
export function FsmStructure() {
  return (
    <Svg w={780} h={330} label="Структурна схема цифрового автомата">
      <Txt x={20} y={90} size={14} weight={600} anchor="start">X</Txt>
      <Ln x1={38} y1={85} x2={200} y2={85} arrow />
      <Box x={200} y={55} w={170} h={70} label="F" sub="логіка переходів" />
      <Ln x1={370} y1={90} x2={440} y2={90} arrow />
      <Txt x={405} y={80} size={13}>S⁺</Txt>
      <Box x={440} y={55} w={160} h={70} label="Регістр стану" sub="тригери" hot />
      <Pl pts={[[600, 90], [650, 90]]} />
      <Dot x={650} y={90} />
      <Pl pts={[[650, 90], [650, 35], [285, 35], [285, 55]]} arrow />
      <Txt x={470} y={28} size={13}>S (поточний стан)</Txt>
      <Pl pts={[[650, 90], [650, 235], [600, 235]]} arrow />
      <Ln x1={520} y1={178} x2={520} y2={125} arrow />
      <Txt x={520} y={196} size={12} fill={C.muted}>CLK</Txt>
      <Box x={440} y={205} w={160} h={60} label="G" sub="логіка виходів" />
      <Ln x1={520} y1={265} x2={520} y2={305} arrow />
      <Txt x={540} y={300} anchor="start" size={14} weight={600}>Y</Txt>
      <Dot x={110} y={85} />
      <Pl pts={[[110, 85], [110, 250], [440, 250]]} dash="6 4" color={C.danger} arrow />
      <Txt x={275} y={242} size={12} fill={C.danger}>тільки в автоматі Мілі: Y = G(S, X)</Txt>
      <Txt x={275} y={282} size={12} fill={C.muted}>в автоматі Мура: Y = G(S)</Txt>
    </Svg>
  );
}
