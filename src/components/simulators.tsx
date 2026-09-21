import { useMemo, useState, type ComponentType } from "react";
import {
  type Bit,
  type GateId,
  bitsFromInt,
  compare,
  countNext,
  decoder,
  demux,
  evalGate,
  fullAdder,
  halfAdder,
  intFromBits,
  jkNext,
  mux,
  not,
  priorityEncoder,
  rippleAdd,
  rsNor,
  shiftLeft,
  shiftRight,
  tNext,
  toggleAt,
} from "@/lib/digital";
import type { TopicId } from "@/lib/topics";
import {
  BitSwitch,
  BitWord,
  ClockBar,
  DipChip,
  GateGlyph,
  Led,
  ModeButton,
  ModeRow,
  Panel,
  TruthTable,
  Waveform,
} from "./circuit";

const GATES: GateId[] = ["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"];

function glyphFor(g: GateId): { kind: "and" | "or" | "xor" | "not"; invert?: boolean } {
  switch (g) {
    case "AND":
      return { kind: "and" };
    case "NAND":
      return { kind: "and", invert: true };
    case "OR":
      return { kind: "or" };
    case "NOR":
      return { kind: "or", invert: true };
    case "XOR":
      return { kind: "xor" };
    case "XNOR":
      return { kind: "xor", invert: true };
    case "NOT":
      return { kind: "not", invert: true };
  }
}

function GatesSim() {
  const [g, setG] = useState<GateId>("NAND");
  const [a, setA] = useState<Bit>(1);
  const [b, setB] = useState<Bit>(1);
  const unary = g === "NOT";
  const y = evalGate(g, a, unary ? 0 : b);
  const glyph = glyphFor(g);
  const rows = unary
    ? [
        [0, evalGate(g, 0, 0)],
        [1, evalGate(g, 1, 0)],
      ]
    : [0, 1].flatMap((aa) =>
        [0, 1].map((bb) => [aa, bb, evalGate(g, aa as Bit, bb as Bit)]),
      );
  const active = unary ? a : a * 2 + b;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Макет">
        <ModeRow>
          {GATES.map((id) => (
            <ModeButton key={id} active={g === id} onClick={() => setG(id)}>
              {id}
            </ModeButton>
          ))}
        </ModeRow>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <div className="flex flex-col gap-3">
            <BitSwitch value={a} onToggle={() => setA(not(a))} label="A" />
            {unary ? null : (
              <BitSwitch value={b} onToggle={() => setB(not(b))} label="B" />
            )}
          </div>
          <GateGlyph kind={glyph.kind} invert={glyph.invert} />
          <Led on={y === 1} label="Y" />
        </div>
        <p className="mt-4 text-center font-mono text-sm text-muted">
          {unary ? `Y = ${g}(A) = ${y}` : `Y = ${g}(A,B) = ${y}`}
        </p>
      </Panel>
      <Panel title="Таблиця істинності">
        <TruthTable
          headers={unary ? ["A", "Y"] : ["A", "B", "Y"]}
          rows={rows}
          activeRow={active}
        />
      </Panel>
    </div>
  );
}

type FfKind = "RS" | "D" | "JK" | "T";

function FlipFlopSim() {
  const [kind, setKind] = useState<FfKind>("JK");
  const [q, setQ] = useState<Bit>(0);
  const [s, setS] = useState<Bit>(0);
  const [r, setR] = useState<Bit>(0);
  const [d, setD] = useState<Bit>(1);
  const [j, setJ] = useState<Bit>(1);
  const [k, setK] = useState<Bit>(1);
  const [t, setT] = useState<Bit>(1);
  const [trace, setTrace] = useState<Bit[]>([0]);
  const [invalid, setInvalid] = useState(false);

  const applyRs = (ns: Bit, nr: Bit) => {
    const next = rsNor(q, ns, nr);
    if (next === "X") {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setQ(next);
    setTrace((prev) => [...prev, next].slice(-12));
  };

  const pulse = () => {
    let next: Bit = q;
    if (kind === "D") next = d;
    if (kind === "JK") next = jkNext(q, j, k);
    if (kind === "T") next = tNext(q, t);
    setQ(next);
    setTrace((prev) => [...prev, next].slice(-12));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <Panel title="Макет">
        <ModeRow>
          {(["RS", "D", "JK", "T"] as FfKind[]).map((id) => (
            <ModeButton
              key={id}
              active={kind === id}
              onClick={() => {
                setKind(id);
                setInvalid(false);
              }}
            >
              {id}
            </ModeButton>
          ))}
        </ModeRow>
        <DipChip
          part={kind === "RS" ? "latch NOR" : "edge FF"}
          name={`${kind}-тригер`}
          left={
            kind === "RS" ? (
              <>
                <BitSwitch
                  value={s}
                  label="S"
                  onToggle={() => {
                    const ns = not(s);
                    setS(ns);
                    applyRs(ns, r);
                  }}
                />
                <BitSwitch
                  value={r}
                  label="R"
                  onToggle={() => {
                    const nr = not(r);
                    setR(nr);
                    applyRs(s, nr);
                  }}
                />
              </>
            ) : kind === "D" ? (
              <BitSwitch value={d} label="D" onToggle={() => setD(not(d))} />
            ) : kind === "JK" ? (
              <>
                <BitSwitch value={j} label="J" onToggle={() => setJ(not(j))} />
                <BitSwitch value={k} label="K" onToggle={() => setK(not(k))} />
              </>
            ) : (
              <BitSwitch value={t} label="T" onToggle={() => setT(not(t))} />
            )
          }
          right={
            <>
              <Led on={q === 1 && !invalid} label="Q" />
              <Led on={q === 0 && !invalid} label="Q̅" />
            </>
          }
        />
        {kind === "RS" ? (
          <p className="mt-3 text-sm text-muted">
            Асинхронна защіпка: зміна S/R одразу впливає на Q.
            {invalid ? " Заборонена комбінація S=R=1." : null}
          </p>
        ) : (
          <div className="mt-4">
            <ClockBar
              onPulse={pulse}
              hint="Один клік = зростаючий фронт і фіксація Q⁺."
            />
          </div>
        )}
        {invalid ? (
          <p className="mt-3 text-sm text-danger">
            Стан X: обидва виходи NOR = 0. Зніміть S або R.
          </p>
        ) : null}
      </Panel>
      <Panel title="Часова діаграма Q">
        <Waveform samples={trace} label="Q" />
        <p className="mt-4 font-mono text-sm text-muted">
          Q = {q}
          {kind === "JK" ? `    Q⁺ = ${jkNext(q, j, k)}` : null}
          {kind === "T" ? `    Q⁺ = ${tNext(q, t)}` : null}
          {kind === "D" ? `    Q⁺ = ${d}` : null}
        </p>
      </Panel>
    </div>
  );
}

type RegMode = "HOLD" | "LOAD" | "SHR" | "SHL";

function RegisterSim() {
  const [q, setQ] = useState<Bit[]>([1, 0, 1, 1]);
  const [d, setD] = useState<Bit[]>([0, 1, 1, 0]);
  const [si, setSi] = useState<Bit>(0);
  const [mode, setMode] = useState<RegMode>("SHR");
  const [trace, setTrace] = useState<Bit[]>([1]);

  const pulse = () => {
    let next = q;
    if (mode === "LOAD") next = d;
    if (mode === "SHR") next = shiftRight(q, si);
    if (mode === "SHL") next = shiftLeft(q, si);
    setQ(next);
    setTrace((prev) => [...prev, next[0] ?? 0].slice(-12));
  };

  return (
    <div className="space-y-4">
      <Panel title="Універсальний 4-бітний регістр">
        <ModeRow>
          {(["HOLD", "LOAD", "SHR", "SHL"] as RegMode[]).map((id) => (
            <ModeButton key={id} active={mode === id} onClick={() => setMode(id)}>
              {id}
            </ModeButton>
          ))}
        </ModeRow>
        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-xs text-muted">Паралельні входи D</p>
            <BitWord
              bits={d}
              labels={["D3", "D2", "D1", "D0"]}
              onToggle={(i) => setD(toggleAt(d, i))}
            />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted">Виходи Q</p>
            <BitWord bits={q} labels={["Q3", "Q2", "Q1", "Q0"]} readOnly />
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <BitSwitch value={si} label="SI" onToggle={() => setSi(not(si))} />
            <ClockBar onPulse={pulse} hint="SHR: SI → Q3 → … → Q0. SHL: SI → Q0." />
          </div>
        </div>
      </Panel>
      <Panel title="Q3 після тактів">
        <Waveform samples={trace} label="Q3" />
      </Panel>
    </div>
  );
}

function CounterSim() {
  const [value, setValue] = useState(9);
  const [up, setUp] = useState(true);
  const [en, setEn] = useState<Bit>(1);
  const [rst, setRst] = useState<Bit>(0);
  const [trace, setTrace] = useState<Bit[]>([1]);
  const bits = bitsFromInt(value, 4);

  const pulse = () => {
    const next = countNext(value, 4, up, en, rst);
    setValue(next);
    setTrace((prev) => [...prev, bitsFromInt(next, 4)[0] ?? 0].slice(-12));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel title="4-бітний двійковий лічильник">
        <ModeRow>
          <ModeButton active={up} onClick={() => setUp(true)}>
            UP
          </ModeButton>
          <ModeButton active={!up} onClick={() => setUp(false)}>
            DOWN
          </ModeButton>
        </ModeRow>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <BitSwitch value={en} label="EN" onToggle={() => setEn(not(en))} />
          <BitSwitch value={rst} label="RST" onToggle={() => setRst(not(rst))} />
        </div>
        <div className="mt-5">
          <BitWord bits={bits} labels={["Q3", "Q2", "Q1", "Q0"]} readOnly />
        </div>
        <p className="mt-3 font-mono text-2xl tabular-nums text-fg">
          {value}
          <span className="ml-1 text-sm text-muted"> / 16</span>
        </p>
        <div className="mt-4">
          <ClockBar
            onPulse={pulse}
            hint="RST=1 має пріоритет і обнуляє. EN=0 утримує код."
          />
        </div>
      </Panel>
      <Panel title="Старший розряд Q3">
        <Waveform samples={trace} label="Q3" />
        <p className="mt-4 text-sm text-muted">
          Період Q3 = 16 тактів. Зараз {up ? "додавання" : "віднімання"}{" "}
          за модулем 16.
        </p>
      </Panel>
    </div>
  );
}

function EncoderSim() {
  const [inputs, setInputs] = useState<Bit[]>([0, 0, 0, 0, 0, 1, 0, 0]);
  const { code, valid } = priorityEncoder(inputs);
  const winner = inputs.reduce((acc, b, i) => (b === 1 ? i : acc), -1);

  return (
    <Panel title="Пріоритетний шифратор 8→3">
      <p className="mb-4 text-sm text-muted">
        Найвищий активний Ii перемагає. Зараз{" "}
        {valid ? `I${winner} → ${intFromBits(code)}` : "немає запиту, GS=0"}.
      </p>
      <div className="flex flex-wrap gap-2">
        {inputs.map((b, i) => (
          <BitSwitch
            key={i}
            value={b}
            label={`I${i}`}
            onToggle={() => setInputs(toggleAt(inputs, i))}
          />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <BitWord bits={code} labels={["Y2", "Y1", "Y0"]} readOnly />
        <Led on={valid === 1} label="GS" />
      </div>
    </Panel>
  );
}

function DecoderSim() {
  const [wide, setWide] = useState(false);
  const width = wide ? 3 : 2;
  const [sel, setSel] = useState<Bit[]>([1, 0]);
  const [en, setEn] = useState<Bit>(1);
  const s = sel.slice(0, width);
  const y = decoder(s, en);

  return (
    <Panel title="Дешифратор n→2ⁿ">
      <ModeRow>
        <ModeButton
          active={!wide}
          onClick={() => {
            setWide(false);
            setSel(sel.slice(-2));
          }}
        >
          2→4
        </ModeButton>
        <ModeButton
          active={wide}
          onClick={() => {
            setWide(true);
            setSel(sel.length === 3 ? sel : [0, ...sel]);
          }}
        >
          3→8
        </ModeButton>
      </ModeRow>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <BitWord
          bits={s}
          labels={width === 3 ? ["A2", "A1", "A0"] : ["A1", "A0"]}
          onToggle={(i) => setSel(toggleAt(s, i))}
        />
        <BitSwitch value={en} label="E" onToggle={() => setEn(not(en))} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {y.map((b, i) => (
          <Led key={i} on={b === 1} label={`Y${i}`} />
        ))}
      </div>
    </Panel>
  );
}

function ComparatorSim() {
  const [a, setA] = useState<Bit[]>([1, 0, 0, 0]);
  const [b, setB] = useState<Bit[]>([0, 1, 1, 1]);
  const r = compare(a, b);

  return (
    <Panel title="4-бітний компаратор">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs text-muted">Операнд A</p>
          <BitWord bits={a} labels={["A3", "A2", "A1", "A0"]} onToggle={(i) => setA(toggleAt(a, i))} />
        </div>
        <div>
          <p className="mb-2 text-xs text-muted">Операнд B</p>
          <BitWord bits={b} labels={["B3", "B2", "B1", "B0"]} onToggle={(i) => setB(toggleAt(b, i))} />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-6">
        <Led on={r.gt === 1} label="A>B" />
        <Led on={r.eq === 1} label="A=B" />
        <Led on={r.lt === 1} label="A<B" />
      </div>
    </Panel>
  );
}

type AdderKind = "half" | "full" | "ripple";

function AdderSim() {
  const [kind, setKind] = useState<AdderKind>("ripple");
  const [a, setA] = useState<Bit>(1);
  const [b, setB] = useState<Bit>(1);
  const [cin, setCin] = useState<Bit>(1);
  const [wa, setWa] = useState<Bit[]>([0, 1, 0, 1]);
  const [wb, setWb] = useState<Bit[]>([0, 0, 1, 1]);
  const [wcin, setWcin] = useState<Bit>(0);

  const ha = halfAdder(a, b);
  const fa = fullAdder(a, b, cin);
  const rip = useMemo(() => rippleAdd(wa, wb, wcin), [wa, wb, wcin]);

  return (
    <div className="space-y-4">
      <Panel>
        <ModeRow>
          <ModeButton active={kind === "half"} onClick={() => setKind("half")}>
            Напівсуматор
          </ModeButton>
          <ModeButton active={kind === "full"} onClick={() => setKind("full")}>
            Повний
          </ModeButton>
          <ModeButton active={kind === "ripple"} onClick={() => setKind("ripple")}>
            4 біти
          </ModeButton>
        </ModeRow>
        {kind !== "ripple" ? (
          <div className="mt-5">
            <DipChip
              part={kind === "half" ? "HA" : "FA"}
              name={kind === "half" ? "½ Σ" : "Σ"}
              left={
                <>
                  <BitSwitch value={a} label="A" onToggle={() => setA(not(a))} />
                  <BitSwitch value={b} label="B" onToggle={() => setB(not(b))} />
                  {kind === "full" ? (
                    <BitSwitch value={cin} label="Cin" onToggle={() => setCin(not(cin))} />
                  ) : null}
                </>
              }
              right={
                kind === "half" ? (
                  <>
                    <Led on={ha.s === 1} label="S" />
                    <Led on={ha.c === 1} label="C" />
                  </>
                ) : (
                  <>
                    <Led on={fa.s === 1} label="S" />
                    <Led on={fa.cout === 1} label="Cout" />
                  </>
                )
              }
            />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <BitWord bits={wa} labels={["A3", "A2", "A1", "A0"]} onToggle={(i) => setWa(toggleAt(wa, i))} />
            <BitWord bits={wb} labels={["B3", "B2", "B1", "B0"]} onToggle={(i) => setWb(toggleAt(wb, i))} />
            <BitSwitch value={wcin} label="Cin" onToggle={() => setWcin(not(wcin))} />
            <div className="flex flex-wrap items-end gap-4">
              <BitWord bits={rip.sum} labels={["S3", "S2", "S1", "S0"]} readOnly />
              <Led on={rip.cout === 1} label="Cout" />
            </div>
            <p className="font-mono text-sm text-muted">
              {intFromBits(wa)} + {intFromBits(wb)} + {wcin} = {intFromBits(rip.sum)}
              {rip.cout ? " + 16" : ""}
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

function MuxSim() {
  const [inputs, setInputs] = useState<Bit[]>([1, 0, 1, 0]);
  const [sel, setSel] = useState<Bit[]>([1, 0]);
  const [en, setEn] = useState<Bit>(1);
  const y = en === 1 ? mux(inputs, sel) : 0;
  const idx = intFromBits(sel);

  return (
    <Panel title="Мультиплексор 4:1">
      <div className="flex flex-wrap gap-3">
        {inputs.map((b, i) => (
          <BitSwitch
            key={i}
            value={b}
            label={`I${i}`}
            onToggle={() => setInputs(toggleAt(inputs, i))}
          />
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <BitWord bits={sel} labels={["S1", "S0"]} onToggle={(i) => setSel(toggleAt(sel, i))} />
        <BitSwitch value={en} label="E" onToggle={() => setEn(not(en))} />
        <Led on={y === 1} label="Y" />
      </div>
      <p className="mt-4 font-mono text-sm text-muted">
        S={idx} → Y = {en === 1 ? `I${idx}` : "0 (строб)"} = {y}
      </p>
    </Panel>
  );
}

function DemuxSim() {
  const [d, setD] = useState<Bit>(1);
  const [sel, setSel] = useState<Bit[]>([0, 1]);
  const y = demux(d, sel);
  const idx = intFromBits(sel);

  return (
    <Panel title="Демультиплексор 1:4">
      <div className="flex flex-wrap items-end gap-4">
        <BitSwitch value={d} label="D" onToggle={() => setD(not(d))} />
        <BitWord bits={sel} labels={["S1", "S0"]} onToggle={(i) => setSel(toggleAt(sel, i))} />
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        {y.map((b, i) => (
          <Led key={i} on={b === 1} label={`Y${i}`} />
        ))}
      </div>
      <p className="mt-4 font-mono text-sm text-muted">
        Y{idx} = D = {d}, решта = 0
      </p>
    </Panel>
  );
}

const SIM: Record<TopicId, ComponentType> = {
  gates: GatesSim,
  flipflops: FlipFlopSim,
  registers: RegisterSim,
  counters: CounterSim,
  encoders: EncoderSim,
  decoders: DecoderSim,
  comparators: ComparatorSim,
  adders: AdderSim,
  mux: MuxSim,
  demux: DemuxSim,
};

export function TopicSimulator({ topicId }: { topicId: TopicId }) {
  const Sim = SIM[topicId];
  return <Sim />;
}
