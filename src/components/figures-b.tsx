import { Box, C, Dot, FFBox, Gate, Ln, Pl, Svg, Txt } from "./figure-kit";


// ── t09: часова діаграма 3-розрядного сумуючого лічильника ───────────────
export function CounterTiming() {
  const x0 = 110;
  const T = 60;
  const t = (k: number) => x0 + k * T;
  const base = (row: number) => 60 + row * 70;
  const hi = (row: number) => base(row) - 30;
  const clk: [number, number][] = [[80, base(0)]];
  for (let k = 0; k < 8; k++) {
    clk.push([t(k), base(0)], [t(k), hi(0)], [t(k) + 30, hi(0)], [t(k) + 30, base(0)]);
  }
  clk.push([t(7) + T, base(0)]);
  const wave = (bit: number, row: number): [number, number][] => {
    const lv = (v: number) => (v ? hi(row) : base(row));
    const pts: [number, number][] = [[80, lv(0)]];
    let prev = 0;
    for (let k = 0; k < 8; k++) {
      const v = (((k + 1) % 8) >> bit) & 1;
      pts.push([t(k), lv(prev)], [t(k), lv(v)]);
      prev = v;
    }
    pts.push([t(7) + T, lv(prev)]);
    return pts;
  };
  return (
    <Svg w={700} h={350} label="Часова діаграма трирозрядного сумуючого лічильника">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
        <Ln key={k} x1={t(k)} y1={20} x2={t(k)} y2={300} color={C.border} dash="3 5" w={1} />
      ))}
      {["CLK", "Q0", "Q1", "Q2"].map((n, r) => (
        <Txt key={n} x={60} y={base(r) - 8} anchor="end" size={14} weight={600}>{n}</Txt>
      ))}
      <Pl pts={clk} color={C.muted} />
      <Pl pts={wave(0, 1)} color={C.sig} />
      <Pl pts={wave(1, 2)} color={C.sig} />
      <Pl pts={wave(2, 3)} color={C.sig} />
      <Txt x={(80 + t(0)) / 2} y={325} size={14} mono>0</Txt>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
        <Txt key={k} x={t(k) + 30} y={325} size={14} mono weight={700}>{(k + 1) % 8}</Txt>
      ))}
      <Txt x={40} y={325} anchor="end" size={12} fill={C.muted}>стан:</Txt>
    </Svg>
  );
}

// ── t10: асинхронний (скрізний) лічильник на T-тригерах ───────────────────
export function RippleCounter() {
  const x = (i: number) => 110 + i * 200;
  const labels = ["f/2", "f/4", "f/8"];
  return (
    <Svg w={780} h={240} label="Асинхронний лічильник на T-тригерах (дільник частоти)">
      <Txt x={30} y={142} size={14} weight={600}>f</Txt>
      <Ln x1={44} y1={137} x2={x(0)} y2={137} arrow />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <FFBox x={x(i)} y={60} w={90} h={100} title={`T-тригер ${i}`} left={[{ label: "T=1", y: 85 }]} right={[{ label: "Q", y: 137 }]} clockY={137} />
          <circle cx={x(i) - 5} cy={137} r={4} fill={C.surf} stroke={C.fg} strokeWidth={1.8} />
          <Ln x1={x(i) + 90} y1={137} x2={i < 2 ? x(i + 1) - 9 : x(i) + 160} y2={137} arrow />
          <Txt x={x(i) + 128} y={125} size={13} fill={C.sig} weight={600}>{labels[i]}</Txt>
          <Txt x={x(i) + 45} y={190} size={13} fill={C.muted}>Q{i}</Txt>
        </g>
      ))}
      <Txt x={390} y={225} size={12} fill={C.muted}>Кожен тригер ділить частоту на 2; кружечок — спрацювання по зрізу</Txt>
    </Svg>
  );
}

// ── t11: пріоритетний шифратор 8→3 ─────────────────────────────────────────
export function EncoderBlock() {
  const y = (i: number) => 52 + i * 34;
  const active = 5;
  return (
    <Svg w={640} h={340} label="Пріоритетний шифратор 8→3">
      <Box x={220} y={26} w={150} h={290} label="CD" sub="8 → 3" />
      {Array.from({ length: 8 }, (_, i) => {
        const idx = 7 - i;
        const on = idx === active;
        return (
          <g key={idx}>
            <Ln x1={140} y1={y(i)} x2={220} y2={y(i)} color={on ? C.sig : C.fg} />
            <Txt x={132} y={y(i) + 5} anchor="end" size={13} fill={on ? C.sig : C.fg} weight={on ? 700 : 400}>I{idx} = {on ? 1 : 0}</Txt>
          </g>
        );
      })}
      {[
        ["Y2", 1, 100],
        ["Y1", 0, 150],
        ["Y0", 1, 200],
        ["GS", 1, 270],
      ].map(([n, v, yy]) => (
        <g key={n as string}>
          <Ln x1={370} y1={yy as number} x2={450} y2={yy as number} color={v ? C.sig : C.fg} arrow />
          <Txt x={460} y={(yy as number) + 5} anchor="start" size={14} weight={600} fill={v ? C.sig : C.fg}>{n} = {v}</Txt>
        </g>
      ))}
      <Txt x={320} y={334} size={12} fill={C.muted}>Активний I5 → код 101 (двійкове 5); GS = 1: є активний вхід</Txt>
    </Svg>
  );
}

// ── t12: дешифратор 3→8 ───────────────────────────────────────────────────
export function DecoderBlock() {
  const y = (i: number) => 52 + i * 34;
  const sel = 5;
  const ins: [string, number, number][] = [["A2", 1, 90], ["A1", 0, 140], ["A0", 1, 190], ["E", 1, 270]];
  return (
    <Svg w={640} h={340} label="Дешифратор 3→8">
      <Box x={220} y={26} w={150} h={290} label="DC" sub="3 → 8" />
      {ins.map(([n, v, yy]) => (
        <g key={n}>
          <Ln x1={140} y1={yy} x2={220} y2={yy} color={v ? C.sig : C.fg} arrow />
          <Txt x={132} y={yy + 5} anchor="end" size={14} weight={600} fill={v ? C.sig : C.fg}>{n} = {v}</Txt>
        </g>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <Ln x1={370} y1={y(i)} x2={450} y2={y(i)} color={i === sel ? C.sig : C.fg} />
          <Txt x={460} y={y(i) + 5} anchor="start" size={13} weight={i === sel ? 700 : 400} fill={i === sel ? C.sig : C.fg}>Y{i} = {i === sel ? 1 : 0}</Txt>
        </g>
      ))}
      <Txt x={320} y={334} size={12} fill={C.muted}>Код A2A1A0 = 101₂ = 5 → активний лише вихід Y5</Txt>
    </Svg>
  );
}

// ── t13: мультиплексор 4→1 ────────────────────────────────────────────────
export function MuxDiagram() {
  const ys = [70, 120, 170, 220];
  return (
    <Svg w={560} h={350} label="Мультиплексор 4→1">
      <polygon points="210,30 340,75 340,225 210,270" fill={C.surf} stroke={C.fg} strokeWidth={1.8} strokeLinejoin="round" />
      <Txt x={262} y={158} size={18} weight={700}>MUX</Txt>
      {ys.map((yy, i) => (
        <g key={i}>
          <Ln x1={130} y1={yy} x2={210} y2={yy} color={i === 2 ? C.sig : C.fg} arrow />
          <Txt x={122} y={yy + 5} anchor="end" size={14} weight={600} fill={i === 2 ? C.sig : C.fg}>x{i}</Txt>
        </g>
      ))}
      <Ln x1={210} y1={170} x2={340} y2={150} color={C.sig} w={2.4} />
      <Ln x1={340} y1={150} x2={430} y2={150} color={C.sig} arrow />
      <Txt x={440} y={156} anchor="start" size={15} weight={700} fill={C.sig}>D = x2</Txt>
      <Ln x1={250} y1={305} x2={250} y2={256} arrow />
      <Ln x1={300} y1={305} x2={300} y2={239} arrow />
      <Txt x={258} y={325} anchor="end" size={14} weight={600}>A0 = 0</Txt>
      <Txt x={292} y={325} anchor="start" size={14} weight={600}>A1 = 1</Txt>
      <Txt x={275} y={343} size={12} fill={C.muted}>адреса A1A0 = 10₂ = 2</Txt>
    </Svg>
  );
}

// ── t14: демультиплексор 1→4 ─────────────────────────────────────────────
export function DemuxDiagram() {
  const ys = [70, 120, 170, 220];
  return (
    <Svg w={560} h={350} label="Демультиплексор 1→4">
      <polygon points="210,75 340,30 340,270 210,225" fill={C.surf} stroke={C.fg} strokeWidth={1.8} strokeLinejoin="round" />
      <Txt x={288} y={158} size={18} weight={700}>DMX</Txt>
      <Ln x1={130} y1={150} x2={210} y2={150} color={C.sig} arrow />
      <Txt x={122} y={155} anchor="end" size={14} weight={600} fill={C.sig}>D = 1</Txt>
      <Ln x1={210} y1={150} x2={340} y2={120} color={C.sig} w={2.4} />
      {ys.map((yy, i) => (
        <g key={i}>
          <Ln x1={340} y1={yy} x2={420} y2={yy} color={i === 1 ? C.sig : C.fg} arrow />
          <Txt x={430} y={yy + 5} anchor="start" size={14} weight={600} fill={i === 1 ? C.sig : C.fg}>x{i} = {i === 1 ? 1 : 0}</Txt>
        </g>
      ))}
      <Ln x1={250} y1={305} x2={250} y2={239} arrow />
      <Ln x1={300} y1={305} x2={300} y2={256} arrow />
      <Txt x={258} y={325} anchor="end" size={14} weight={600}>A0 = 1</Txt>
      <Txt x={292} y={325} anchor="start" size={14} weight={600}>A1 = 0</Txt>
      <Txt x={275} y={343} size={12} fill={C.muted}>адреса A1A0 = 01₂ = 1</Txt>
    </Svg>
  );
}

// ── t15: напівсуматор і повний суматор ────────────────────────────────────
export function Adders() {
  return (
    <Svg w={780} h={300} label="Напівсуматор і повний суматор">
      <Txt x={150} y={22} size={14} weight={700}>Напівсуматор</Txt>
      <Txt x={40} y={55} anchor="end" size={14} weight={600}>A</Txt>
      <Ln x1={48} y1={50} x2={150} y2={50} />
      <Pl pts={[[100, 50], [100, 140], [150, 140]]} />
      <Dot x={100} y={50} />
      <Txt x={40} y={165} anchor="end" size={14} weight={600}>B</Txt>
      <Ln x1={48} y1={160} x2={150} y2={160} />
      <Pl pts={[[80, 160], [80, 70], [150, 70]]} />
      <Dot x={80} y={160} />
      <Gate type="xor" x={150} y={40} />
      <Gate type="and" x={150} y={130} />
      <Ln x1={198} y1={60} x2={260} y2={60} arrow />
      <Txt x={270} y={65} anchor="start" size={14} weight={600}>S</Txt>
      <Ln x1={198} y1={150} x2={260} y2={150} arrow />
      <Txt x={270} y={155} anchor="start" size={14} weight={600}>C</Txt>
      <Txt x={150} y={225} size={13}>S = A ⊕ B</Txt>
      <Txt x={150} y={245} size={13}>C = A · B</Txt>

      <Txt x={570} y={22} size={14} weight={700}>Повний суматор</Txt>
      <Box x={420} y={40} w={70} h={70} label="HA" />
      <Box x={540} y={40} w={70} h={70} label="HA" />
      <Txt x={384} y={65} anchor="end" size={14} weight={600}>A</Txt>
      <Txt x={384} y={95} anchor="end" size={14} weight={600}>B</Txt>
      <Ln x1={392} y1={60} x2={420} y2={60} arrow />
      <Ln x1={392} y1={90} x2={420} y2={90} arrow />
      <Ln x1={490} y1={60} x2={540} y2={60} arrow />
      <Txt x={515} y={52} size={11} fill={C.muted}>S1</Txt>
      <Pl pts={[[392, 215], [522, 215], [522, 90], [540, 90]]} arrow />
      <Txt x={384} y={220} anchor="end" size={14} weight={600}>Cin</Txt>
      <Pl pts={[[490, 90], [505, 90], [505, 180], [640, 180]]} />
      <Pl pts={[[610, 90], [625, 90], [625, 160], [640, 160]]} />
      <Gate type="or" x={640} y={150} />
      <Ln x1={610} y1={60} x2={700} y2={60} arrow />
      <Txt x={710} y={65} anchor="start" size={14} weight={600}>S</Txt>
      <Ln x1={688} y1={170} x2={720} y2={170} arrow />
      <Txt x={728} y={175} anchor="start" size={14} weight={600}>Cout</Txt>
      <Txt x={570} y={260} size={13}>S = A ⊕ B ⊕ Cin</Txt>
      <Txt x={570} y={280} size={13}>Cout = C1 + C2 (два напівсуматори і АБО)</Txt>
    </Svg>
  );
}

// ── t16: чотирирозрядний компаратор ───────────────────────────────────────
export function ComparatorBlock() {
  return (
    <Svg w={620} h={350} label="Чотирирозрядний компаратор з каскадними входами">
      <Box x={230} y={40} w={170} h={190} label="COMP" sub="4 розряди" />
      <Ln x1={110} y1={100} x2={230} y2={100} w={3} arrow />
      <Txt x={100} y={105} anchor="end" size={14} weight={600}>A[3:0]</Txt>
      <Ln x1={110} y1={170} x2={230} y2={170} w={3} arrow />
      <Txt x={100} y={175} anchor="end" size={14} weight={600}>B[3:0]</Txt>
      {[["A>B", 80], ["A=B", 135], ["A<B", 190]].map(([n, yy]) => (
        <g key={n as string}>
          <Ln x1={400} y1={yy as number} x2={480} y2={yy as number} arrow />
          <Txt x={490} y={(yy as number) + 5} anchor="start" size={14} weight={600}>{n}</Txt>
        </g>
      ))}
      {[["A>B", 265], ["A=B", 315], ["A<B", 365]].map(([n, xx]) => (
        <g key={n as string}>
          <Ln x1={(xx as number) - 35} y1={300} x2={(xx as number) - 35} y2={230} arrow />
          <Txt x={(xx as number) - 35} y={320} size={13} weight={600}>{n}</Txt>
        </g>
      ))}
      <Txt x={315} y={342} size={12} fill={C.muted}>каскадні входи (виходи молодшого компаратора)</Txt>
    </Svg>
  );
}

// ── t17: дискретизація та квантування ─────────────────────────────────────
export function AdcSampling() {
  const x0 = 100, x1 = 670, yTop = 30, yBot = 300, L = 8, N = 12;
  const lvl = (yBot - yTop) / L;
  const V = (t: number) => 0.5 + 0.46 * Math.sin(2 * Math.PI * t);
  const X = (t: number) => x0 + t * (x1 - x0);
  const Y = (v: number) => yBot - v * (yBot - yTop);
  const sine: [number, number][] = Array.from({ length: 121 }, (_, i) => [X(i / 120), Y(V(i / 120))]);
  const bin = (n: number) => n.toString(2).padStart(3, "0");
  const w = (x1 - x0) / N;
  return (
    <Svg w={720} h={380} label="Дискретизація й квантування 3-розрядним АЦП">
      {Array.from({ length: L + 1 }, (_, j) => (
        <Ln key={j} x1={x0} y1={yBot - j * lvl} x2={x1} y2={yBot - j * lvl} color={C.border} w={1} />
      ))}
      {Array.from({ length: L }, (_, j) => (
        <Txt key={j} x={x0 - 12} y={yBot - (j + 0.5) * lvl + 4} anchor="end" size={12} mono fill={C.muted}>{bin(j)}</Txt>
      ))}
      <Ln x1={x0} y1={yTop - 6} x2={x0} y2={yBot} />
      <Ln x1={x0} y1={yBot} x2={x1 + 10} y2={yBot} arrow />
      <Txt x={x1 + 8} y={yBot + 18} anchor="end" size={12} fill={C.muted}>t</Txt>
      <Txt x={x0 - 12} y={yTop - 10} anchor="end" size={12} fill={C.muted}>U</Txt>
      <Pl pts={sine} color={C.fg} w={2.2} />
      {Array.from({ length: N }, (_, i) => {
        const t = (i + 0.5) / N;
        const v = V(t);
        const code = Math.min(L - 1, Math.floor(v * L));
        const xs = X(t);
        return (
          <g key={i}>
            <Ln x1={xs} y1={Y(v)} x2={xs} y2={yBot} color={C.muted} dash="3 4" w={1} />
            <Ln x1={xs - w / 2 + 3} y1={yBot - (code + 0.5) * lvl} x2={xs + w / 2 - 3} y2={yBot - (code + 0.5) * lvl} color={C.sig} w={3} />
            <circle cx={xs} cy={Y(v)} r={4} fill="var(--color-bg)" stroke={C.fg} strokeWidth={1.8} />
            <Txt x={xs} y={yBot + 18} size={11} mono fill={C.sig}>{bin(code)}</Txt>
          </g>
        );
      })}
      <Txt x={x0} y={360} anchor="start" size={12} fill={C.muted}>— аналоговий сигнал</Txt>
      <Txt x={x0 + 190} y={360} anchor="start" size={12} fill={C.muted}>○ відліки (дискретизація)</Txt>
      <Txt x={x0 + 410} y={360} anchor="start" size={12} fill={C.sig}>▬ рівень квантування і код</Txt>
    </Svg>
  );
}

// ── t18: ЦАП на матриці R-2R ──────────────────────────────────────────────
function Res({ x, y, vertical, label }: { x: number; y: number; vertical?: boolean; label: string }) {
  return vertical ? (
    <g>
      <rect x={x - 8} y={y} width={16} height={40} fill={C.surf} stroke={C.fg} strokeWidth={1.8} />
      <Txt x={x + 14} y={y + 25} anchor="start" size={12} fill={C.muted}>{label}</Txt>
    </g>
  ) : (
    <g>
      <rect x={x} y={y - 8} width={40} height={16} fill={C.surf} stroke={C.fg} strokeWidth={1.8} />
      <Txt x={x + 20} y={y - 14} size={12} fill={C.muted}>{label}</Txt>
    </g>
  );
}

export function DacLadder() {
  const nodes = [
    { x: 170, bit: "a0", note: "мол." },
    { x: 330, bit: "a1", note: "" },
    { x: 490, bit: "a2", note: "старш." },
  ];
  return (
    <Svg w={720} h={340} label="Трирозрядний ЦАП на резисторній матриці R-2R">
      <Ln x1={100} y1={100} x2={600} y2={100} />
      <Ln x1={100} y1={100} x2={100} y2={115} />
      <Res x={100} y={115} vertical label="2R" />
      <Ln x1={100} y1={155} x2={100} y2={185} />
      <Ln x1={84} y1={185} x2={116} y2={185} />
      <Ln x1={90} y1={192} x2={110} y2={192} />
      <Ln x1={95} y1={199} x2={105} y2={199} />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={(nodes[i]!.x + nodes[i + 1]!.x) / 2 - 20} y={92} width={40} height={16} fill={C.surf} stroke={C.fg} strokeWidth={1.8} />
          <Txt x={(nodes[i]!.x + nodes[i + 1]!.x) / 2} y={84} size={12} fill={C.muted}>R</Txt>
        </g>
      ))}
      {nodes.map((n) => (
        <g key={n.bit}>
          <Dot x={n.x} y={100} />
          <Ln x1={n.x} y1={100} x2={n.x} y2={115} />
          <Res x={n.x} y={115} vertical label="2R" />
          <Ln x1={n.x} y1={155} x2={n.x} y2={175} />
          <circle cx={n.x} cy={178} r={4} fill={C.fg} />
          <Ln x1={n.x} y1={178} x2={n.x - 24} y2={212} />
          <Ln x1={n.x - 24} y1={212} x2={n.x - 24} y2={225} color={C.muted} />
          <Ln x1={n.x + 24} y1={212} x2={n.x + 24} y2={225} color={C.muted} />
          <Txt x={n.x - 24} y={242} size={12} fill={C.sig}>Uref</Txt>
          <Txt x={n.x + 24} y={242} size={12} fill={C.muted}>0 В</Txt>
          <Txt x={n.x} y={275} size={14} weight={600}>{n.bit}</Txt>
          {n.note ? <Txt x={n.x} y={292} size={11} fill={C.muted}>{n.note} розряд</Txt> : null}
        </g>
      ))}
      <Dot x={600} y={100} />
      <Ln x1={600} y1={100} x2={650} y2={100} arrow />
      <Txt x={660} y={105} anchor="start" size={14} weight={700} fill={C.sig}>Uвих</Txt>
      <Txt x={360} y={26} size={13} fill={C.muted}>Uвих = Uref · (a2·½ + a1·¼ + a0·⅛)</Txt>
    </Svg>
  );
}


