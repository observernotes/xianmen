#!/usr/bin/env python3
"""Build a standalone ECMAScript program for Godot's native rules runtime."""

from build import ROOT, events_bundle, logic_bundle


def main():
    data = ROOT / "godot" / "data"
    program = "\n".join((
        # A few older content modules register their data through this global.
        "globalThis.window = globalThis;",
        events_bundle(),
        logic_bundle(),
        "globalThis.XianmenCinematicCatalog = " +
        (data.parent / "cinematics" / "catalog.json").read_text(encoding="utf-8").strip() + ";",
        (data / "cinematics.js").read_text(encoding="utf-8"),
        (data / "duels.js").read_text(encoding="utf-8"),
        (data / "player_panels.js").read_text(encoding="utf-8"),
        (data / "panels.js").read_text(encoding="utf-8"),
        (data / "session.js").read_text(encoding="utf-8"),
    ))
    (data / "rules.js").write_text(program, encoding="utf-8")


if __name__ == "__main__":
    main()
