"""Demo runner for blaster_engine.py.

Loads a sample PropStream-style CSV, runs the unified LOI engine across all
three blast modes, and prints how many offers each mode produces plus a
preview of the top rows. Writes the GHL-mapped CSVs next to this script.

Usage:
    python examples/run_engine_demo.py [path/to/list.csv]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd

from blaster_engine import run, detect_source

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "sample_propstream.csv")
    raw = pd.read_csv(src)
    print(f"Loaded {len(raw)} raw rows | detected source: {detect_source(raw.columns)}\n")

    for mode in ("direct_to_agent", "direct_to_seller", "cash"):
        norm, out = run(raw, mode)
        print(f"[{mode:>16}]  {len(out):>3} offers ready (from {len(norm)} normalized rows)")
        if not out.empty:
            preview_cols = [c for c in ("Contact Name", "Address",
                                        "Seller Profit Difference", "Net Cash") if c in out.columns]
            print(out[preview_cols].head(3).to_string(index=False))
        out_path = os.path.join(HERE, f"out_{mode}.csv")
        out.to_csv(out_path, index=False)
        print(f"    -> wrote {out_path}\n")


if __name__ == "__main__":
    main()
