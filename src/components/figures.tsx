import type { ReactNode } from "react";
import { GatesSymbols, GatesTable, CombVsSeq, IcDip14, KarnaughMap, RsLatch, FlipFlopSymbols, ParallelRegister, ShiftRegister } from "./figures-a";
import { AdcSampling, Adders, ComparatorBlock, CounterTiming, DacLadder, DecoderBlock, DemuxDiagram, EncoderBlock, MuxDiagram, RippleCounter } from "./figures-b";
import { Architectures, AvrBlocks, CacheDiagram, CpuBlocks, FsmStructure, FsmTraffic, MemoryPyramid, SketchFlow, UnoPins } from "./figures-c";

export const FIGURES: Record<string, () => ReactNode> = {
  "ic-dip14": IcDip14,
  "gates-symbols": GatesSymbols,
  "gates-table": GatesTable,
  "comb-vs-seq": CombVsSeq,
  karnaugh: KarnaughMap,
  "rs-latch": RsLatch,
  "ff-symbols": FlipFlopSymbols,
  "reg-parallel": ParallelRegister,
  "reg-shift": ShiftRegister,
  "counter-timing": CounterTiming,
  "ripple-counter": RippleCounter,
  encoder: EncoderBlock,
  decoder: DecoderBlock,
  mux: MuxDiagram,
  demux: DemuxDiagram,
  adders: Adders,
  comparator: ComparatorBlock,
  adc: AdcSampling,
  dac: DacLadder,
  "memory-pyramid": MemoryPyramid,
  cache: CacheDiagram,
  "cpu-blocks": CpuBlocks,
  architectures: Architectures,
  avr: AvrBlocks,
  sketch: SketchFlow,
  "uno-pins": UnoPins,
  "fsm-traffic": FsmTraffic,
  "fsm-structure": FsmStructure,
};

/** A captioned figure from the registry; renders nothing for an unknown id. */
export function Figure({ id, caption }: { id: string; caption: string }) {
  const Render = FIGURES[id];
  if (!Render) return null;
  return (
    <figure className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <Render />
      <figcaption className="mt-3 text-center text-sm leading-relaxed text-muted">{caption}</figcaption>
    </figure>
  );
}
