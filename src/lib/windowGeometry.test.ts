import { describe, expect, it } from "vitest";
import { buildSenderUrl, readTargetPeer } from "./constants";
import { sizeForRatio } from "./windowGeometry";

describe("sizeForRatio", () => {
  it("keeps square windows square", () => {
    expect(sizeForRatio(1, { width: 1200, height: 800 })).toEqual({
      width: 456,
      height: 456
    });
  });

  it("caps portrait windows to a usable height", () => {
    expect(sizeForRatio(9 / 16, { width: 3840, height: 2160 })).toEqual({
      width: 383,
      height: 680
    });
  });

  it("rejects invalid ratios", () => {
    expect(() => sizeForRatio(0)).toThrow(RangeError);
  });
});

describe("pairing links", () => {
  it("round-trips a peer id", () => {
    const url = buildSenderUrl("peer / 42", "https://example.test/app");
    expect(url).toBe("https://example.test/app/#/send?to=peer%20%2F%2042");
    expect(readTargetPeer(new URL(url).hash)).toBe("peer / 42");
  });
});
