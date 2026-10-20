import { Box, C, Dot, FFBox, Gate, gatePorts, Ln, Pl, Svg, Txt, type GateType } from "./figure-kit";

const nQ = "Q\u0305";

// ── t01: корпус мікросхеми 74HC00 ────────────────────────────────────────────
export function IcDip14() {
  const left = ["1A", "1B", "1Y", "2A", "2B", "2Y", "GND"];
  const right = ["VCC", "4B", "4A", "4Y", "3B", "3A", "3Y"];
  const y = (i: number) => 62 + i * 30;
  return (
    <Svg w={560} h={300} label="Корпус DIP-14 мікросхеми 74HC00">
      <path d="M170 40H236A14 14 0 0 0 264 40H330V262H170Z" fill={C.surf} stroke={C.fg} strokeWidth={1.8} />
      <Txt x={250} y={140} size={18} weight={700}>74HC00</Txt>
      <Txt x={250} y={164} size={12} fill={C.muted}>4 × І-НЕ (NAND)</Txt>
      {left.map((n, i) => (
        <g key={n}>
          <rect x={150} y={y(i) - 5} width={20} height={10} fill={C.fg} />
          <Txt x={140} y={y(i) + 5} anchor="end" size={13}>{n}</Txt>
          <Txt x={182} y={y(i) + 4} anchor="start" size={11} fill={C.muted}>{i + 1}</Txt>
        </g>
      ))}
      {right.map((n, i) => (
        <g key={n}>
          <rect x={330} y={y(i) - 5} width={20} height={10} fill={n === "VCC" ? C.danger : C.fg} />
          <Txt x={360} y={y(i) + 5} anchor="start" size={13}>{n}</Txt>
          <Txt x={318} y={y(i) + 4} anchor="end" size={11} fill={C.muted}>{14 - i}</Txt>
        </g>
      ))}
      <Txt x={250} y={290} size={12} fill={C.muted}>Виріз (ключ) зверху: відлік виводів проти годинникової стрілки</Txt>
    </Svg>
  );
}

// ── t02: умовні позначення логічних елементів ──────────────────────────────
const GATES: { type: GateType; name: string; formula: string }[] = [
  { type: "not", name: "НЕ (NOT)", formula: "Y = A̅" },
  { type: "and", name: "І (AND)", formula: "Y = A·B" },
  { type: "or", name: "АБО (OR)", formula: "Y = A + B" },
  { type: "nand", name: "І-НЕ (NAND)", formula: "Y = НЕ(A·B)" },
  { type: "nor", name: "АБО-НЕ (NOR)", formula: "Y = НЕ(A + B)" },
  { type: "xor", name: "XOR", formula: "нееквівалентність: A ⊕ B" },
  { type: "xnor", name: "XNOR", formula: "еквівалентність: A ⊙ B" },
];

export function GatesSymbols() {
  return (
    <Svg w={780} h={340} label="Умовні позначення логічних елементів">
      {GATES.map((g, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const ox = 20 + col * 190;
        const oy = 20 + row * 160;
        const gx = ox + 50;
        const gy = oy + 20;
        const p = gatePorts(g.type);
        return (
          <g key={g.type}>
            {p.ins.map(([ix, iy], k) => (
              <g key={k}>
                <Ln x1={gx - 22} y1={gy + iy} x2={gx + ix - (g.type === "xor" || g.type === "xnor" ? 4 : 0)} y2={gy + iy} />
                <Txt x={gx - 28} y={gy + iy + 5} anchor="end" size={13}>{p.ins.length === 1 ? "A" : k === 0 ? "A" : "B"}</Txt>
              </g>
            ))}
            <Gate type={g.type} x={gx} y={gy} />
            <Ln x1={gx + p.out[0]} y1={gy + 20} x2={gx + p.out[0] + 24} y2={gy + 20} />
            <Txt x={gx + p.out[0] + 32} y={gy + 25} anchor="start" size={13}>Y</Txt>
            <Txt x={ox + 80} y={oy + 90} size={13} weight={600}>{g.name}</Txt>
            <Txt x={ox + 80} y={oy + 110} size={12} fill={C.muted}>{g.formula}</Txt>
          </g>
        );
      })}
      <Txt x={20 + 3 * 190 + 70} y={20 + 160 + 60} size={12} fill={C.muted}>Кружечок на виході</Txt>
      <Txt x={20 + 3 * 190 + 70} y={20 + 160 + 78} size={12} fill={C.muted}>означає інверсію</Txt>
    </Svg>
  );
}

const f2: Record<string, (a: number, b: number) => number> = {
  AND: (a, b) => a & b,
  OR: (a, b) => a | b,
  NAND: (a, b) => 1 - (a & b),
  NOR: (a, b) => 1 - (a | b),
  XOR: (a, b) => a ^ b,
  XNOR: (a, b) => 1 - (a ^ b),
};

export function GatesTable() {
  const names = Object.keys(f2);
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-collapse font-mono text-base tabular-nums">
        <thead>
          <tr className="text-sm text-muted">
            <th className="px-4 py-1.5">A</th>
            <th className="px-4 py-1.5">B</th>
            {names.map((n) => (
              <th key={n} className="px-3 py-1.5">{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => (
            <tr key={`${a}${b}`} className="border-t border-border/60">
              <td className="px-4 py-1.5 text-center">{a}</td>
              <td className="px-4 py-1.5 text-center">{b}</td>
              {names.map((n) => (
                <td key={n} className={`px-3 py-1.5 text-center ${f2[n]!(a!, b!) ? "text-signal" : "text-muted"}`}>
                  {f2[n]!(a!, b!)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── t03: комбінаційна й послідовнісна схеми ────────────────────────────────
export function CombVsSeq() {
  return (
    <Svg w={780} h={270} label="Комбінаційна та послідовнісна схеми">
      <Txt x={170} y={28} size={14} weight={700}>Комбінаційна схема</Txt>
      <Ln x1={20} y1={105} x2={90} y2={105} arrow />
      <Txt x={55} y={95} size={13}>X</Txt>
      <Box x={90} y={65} w={160} h={80} label="Комбінаційна" sub="логіка F" />
      <Ln x1={250} y1={105} x2={320} y2={105} arrow />
      <Txt x={288} y={95} size={13}>Y</Txt>
      <Txt x={170} y={180} size={13} fill={C.muted}>Y = F(X) — без памʼяті</Txt>

      <Txt x={590} y={28} size={14} weight={700}>Послідовнісна схема</Txt>
      <Ln x1={400} y1={85} x2={470} y2={85} arrow />
      <Txt x={435} y={75} size={13}>X</Txt>
      <Box x={470} y={55} w={150} h={90} label="Комбінаційна" sub="логіка F" />
      <Ln x1={620} y1={90} x2={700} y2={90} arrow />
      <Txt x={662} y={80} size={13}>Y</Txt>
      <Ln x1={545} y1={145} x2={545} y2={185} arrow />
      <Txt x={575} y={170} size={13}>S⁺</Txt>
      <Box x={495} y={185} w={100} h={50} label="Памʼять" sub="тригери" />
      <Pl pts={[[495, 210], [440, 210], [440, 125], [470, 125]]} arrow />
      <Txt x={430} y={170} size={13} anchor="end">S</Txt>
      <Ln x1={545} y1={262} x2={545} y2={235} arrow />
      <Txt x={575} y={258} size={12} fill={C.muted}>CLK</Txt>
    </Svg>
  );
}

// ── t04: карта Карно ───────────────────────────────────────────────────────
export function KarnaughMap() {
  const gray = [0, 1, 3, 2];
  const bits = ["00", "01", "11", "10"];
  const ones = new Set([4, 5, 7, 12, 13, 15]);
  const x0 = 120, y0 = 70, cw = 62, ch = 52;
  return (
    <Svg w={720} h={320} label="Карта Карно для чотирьох змінних">
      <Txt x={x0 - 52} y={y0 - 26} size={13} fill={C.muted}>AB \ CD</Txt>
      {bits.map((b, i) => (
        <Txt key={`c${b}`} x={x0 + i * cw + cw / 2} y={y0 - 12} size={14} weight={600}>{b}</Txt>
      ))}
      {bits.map((b, i) => (
        <Txt key={`r${b}`} x={x0 - 14} y={y0 + i * ch + ch / 2 + 5} anchor="end" size={14} weight={600}>{b}</Txt>
      ))}
      {gray.map((rv, r) =>
        gray.map((cv, c) => {
          const m = rv * 4 + cv;
          const one = ones.has(m);
          return (
            <g key={m}>
              <rect x={x0 + c * cw} y={y0 + r * ch} width={cw} height={ch} fill={C.surf} stroke={C.border} strokeWidth={1.5} />
              <Txt x={x0 + c * cw + 6} y={y0 + r * ch + 14} anchor="start" size={10} fill={C.muted}>{m}</Txt>
              <Txt x={x0 + c * cw + cw / 2} y={y0 + r * ch + ch / 2 + 7} size={20} weight={700} fill={one ? C.fg : C.muted}>{one ? 1 : 0}</Txt>
            </g>
          );
        }),
      )}
      <rect x={x0 + 4} y={y0 + ch + 4} width={cw * 2 - 8} height={ch * 2 - 8} rx={12} fill="none" stroke={C.sig} strokeWidth={2.5} />
      <rect x={x0 + cw + 10} y={y0 + ch + 10} width={cw * 2 - 8} height={ch * 2 - 8} rx={12} fill="none" stroke={C.danger} strokeWidth={2.5} strokeDasharray="7 4" />
      <Txt x={440} y={90} anchor="start" size={14} fill={C.sig} weight={600}>Блок 1: клітинки 4, 5, 12, 13</Txt>
      <Txt x={440} y={112} anchor="start" size={13} fill={C.muted}>B = 1, C = 0 незмінні → B·C̅</Txt>
      <Txt x={440} y={152} anchor="start" size={14} fill={C.danger} weight={600}>Блок 2: клітинки 5, 7, 13, 15</Txt>
      <Txt x={440} y={174} anchor="start" size={13} fill={C.muted}>B = 1, D = 1 незмінні → B·D</Txt>
      <Txt x={440} y={226} anchor="start" size={16} weight={700}>F = B·C̅ + B·D</Txt>
      <Txt x={440} y={250} anchor="start" size={12} fill={C.muted}>Код Грея: 00, 01, 11, 10</Txt>
    </Svg>
  );
}

// ── t05: RS-тригер на елементах АБО-НЕ ─────────────────────────────────────
export function RsLatch() {
  return (
    <Svg w={780} h={290} label="RS-тригер на двох елементах АБО-НЕ">
      <Gate type="nor" x={260} y={40} />
      <Gate type="nor" x={260} y={170} />
      <Ln x1={190} y1={50} x2={260} y2={50} />
      <Txt x={182} y={55} anchor="end" size={14} weight={600}>R</Txt>
      <Ln x1={190} y1={200} x2={260} y2={200} />
      <Txt x={182} y={205} anchor="end" size={14} weight={600}>S</Txt>
      <Ln x1={316} y1={60} x2={430} y2={60} />
      <Txt x={440} y={65} anchor="start" size={14} weight={600}>Q</Txt>
      <Ln x1={316} y1={190} x2={430} y2={190} />
      <Txt x={440} y={195} anchor="start" size={14} weight={600}>{nQ}</Txt>
      <Pl pts={[[360, 60], [360, 120], [230, 120], [230, 180], [260, 180]]} />
      <Pl pts={[[340, 190], [340, 100], [210, 100], [210, 70], [260, 70]]} />
      <Dot x={360} y={60} />
      <Dot x={340} y={190} />
      <Txt x={520} y={60} anchor="start" size={13} weight={700}>S R</Txt>
      <Txt x={560} y={60} anchor="start" size={13} weight={700} fill={C.sig}>Q⁺</Txt>
      {[
        ["0 0", "Q (збереження)", C.fg],
        ["0 1", "0 (скидання)", C.fg],
        ["1 0", "1 (встановлення)", C.fg],
        ["1 1", "заборонено", C.danger],
      ].map(([a, b, col], i) => (
        <g key={a}>
          <Txt x={520} y={92 + i * 28} anchor="start" size={14} mono>{a}</Txt>
          <Txt x={560} y={92 + i * 28} anchor="start" size={14} fill={col}>{b}</Txt>
        </g>
      ))}
    </Svg>
  );
}

// ── t06: тригери D, JK, T ──────────────────────────────────────────────────
export function FlipFlopSymbols() {
  return (
    <Svg w={780} h={300} label="Умовні позначення D, JK і T тригерів">
      <FFBox x={50} y={60} w={110} h={90} title="D-тригер" left={[{ label: "D", y: 85 }]} right={[{ label: "Q", y: 85 }, { label: nQ, y: 130 }]} clockY={130} />
      <FFBox x={335} y={60} w={110} h={90} title="JK-тригер" left={[{ label: "J", y: 80 }, { label: "K", y: 135 }]} right={[{ label: "Q", y: 85 }, { label: nQ, y: 130 }]} clockY={107} />
      <FFBox x={620} y={60} w={110} h={90} title="T-тригер" left={[{ label: "T", y: 85 }]} right={[{ label: "Q", y: 85 }, { label: nQ, y: 130 }]} clockY={130} />
      {[50, 335, 620].map((x) => (
        <g key={x}>
          <Ln x1={x - 28} y1={x === 335 ? 80 : 85} x2={x} y2={x === 335 ? 80 : 85} />
          <Ln x1={x - 28} y1={x === 335 ? 135 : 130} x2={x} y2={x === 335 ? 135 : 130} />
          <Ln x1={x + 110} y1={85} x2={x + 138} y2={85} />
          <Ln x1={x + 110} y1={130} x2={x + 138} y2={130} />
        </g>
      ))}
      <Ln x1={307} y1={107} x2={335} y2={107} />
      <Txt x={55} y={200} anchor="start" size={14} weight={600}>Q⁺ = D</Txt>
      <Txt x={55} y={222} anchor="start" size={12} fill={C.muted}>запис по фронту CLK</Txt>
      <Txt x={335} y={200} anchor="start" size={13} mono>J K → Q⁺</Txt>
      <Txt x={335} y={222} anchor="start" size={13} mono>0 0 → Q   (зберігання)</Txt>
      <Txt x={335} y={242} anchor="start" size={13} mono>0 1 → 0</Txt>
      <Txt x={335} y={262} anchor="start" size={13} mono>1 0 → 1</Txt>
      <Txt x={335} y={282} anchor="start" size={13} mono fill={C.sig}>1 1 → {nQ}  (перемикання)</Txt>
      <Txt x={620} y={200} anchor="start" size={14} weight={600}>Q⁺ = Q ⊕ T</Txt>
      <Txt x={620} y={222} anchor="start" size={12} fill={C.muted}>T=1: перемикання</Txt>
    </Svg>
  );
}

// ── t07: паралельний регістр ───────────────────────────────────────────────
export function ParallelRegister() {
  const rows = [3, 2, 1, 0];
  const y = (i: number) => 30 + i * 80;
  return (
    <Svg w={640} h={350} label="Чотирирозрядний паралельний регістр на D-тригерах">
      {rows.map((b, i) => (
        <g key={b}>
          <Txt x={140} y={y(i) + 20} anchor="end" size={14} weight={600}>D{b}</Txt>
          <Ln x1={150} y1={y(i) + 15} x2={240} y2={y(i) + 15} arrow />
          <FFBox x={240} y={y(i)} w={90} h={60} left={[{ label: "D", y: y(i) + 15 }]} right={[{ label: "Q", y: y(i) + 15 }]} clockY={y(i) + 45} />
          <Ln x1={90} y1={y(i) + 45} x2={240} y2={y(i) + 45} />
          <Dot x={90} y={y(i) + 45} />
          <Ln x1={330} y1={y(i) + 15} x2={420} y2={y(i) + 15} arrow />
          <Txt x={430} y={y(i) + 20} anchor="start" size={14} weight={600}>Q{b}</Txt>
        </g>
      ))}
      <Ln x1={90} y1={y(0) + 45} x2={90} y2={y(3) + 45 + 40} />
      <Ln x1={50} y1={y(3) + 85} x2={90} y2={y(3) + 85} />
      <Txt x={44} y={y(3) + 90} anchor="end" size={14} weight={600}>CLK</Txt>
      <Txt x={470} y={140} anchor="start" size={12} fill={C.muted}>Усі розряди приймають</Txt>
      <Txt x={470} y={158} anchor="start" size={12} fill={C.muted}>слово за один такт</Txt>
    </Svg>
  );
}

// ── t08: регістр зсуву ────────────────────────────────────────────────────
export function ShiftRegister() {
  const x = (i: number) => 100 + i * 150;
  return (
    <Svg w={780} h={230} label="Чотирирозрядний регістр зсуву на D-тригерах">
      <Txt x={40} y={75} size={14} weight={600}>SI</Txt>
      <Ln x1={58} y1={70} x2={x(0)} y2={70} arrow />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <FFBox x={x(i)} y={50} w={70} h={70} left={[{ label: "D", y: 70 }]} right={[{ label: "Q", y: 70 }]} clockY={105} />
          <Txt x={x(i) + 35} y={40} size={13} fill={C.muted}>Q{3 - i}</Txt>
          {i < 3 ? <Ln x1={x(i) + 70} y1={70} x2={x(i + 1)} y2={70} arrow /> : null}
          <Ln x1={x(i) - 16} y1={105} x2={x(i)} y2={105} />
          <Ln x1={x(i) - 16} y1={105} x2={x(i) - 16} y2={180} />
          <Dot x={x(i) - 16} y={180} />
        </g>
      ))}
      <Ln x1={x(0) - 16} y1={180} x2={x(3) - 16} y2={180} />
      <Ln x1={x(0) - 56} y1={180} x2={x(0) - 16} y2={180} />
      <Txt x={x(0) - 62} y={185} anchor="end" size={14} weight={600}>CLK</Txt>
      <Ln x1={x(3) + 70} y1={70} x2={x(3) + 130} y2={70} arrow />
      <Txt x={x(3) + 140} y={75} anchor="start" size={14} weight={600}>SO</Txt>
      <Txt x={440} y={215} size={12} fill={C.muted}>Кожен такт зсуває слово на один розряд</Txt>
    </Svg>
  );
}
