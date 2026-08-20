import { applyStoryAssets, countStoryImages, sanitizeStoryHtml } from "./story-html";

describe("story-html", () => {
  it("strips scripts and event handlers", () => {
    const dirty =
      `<p onclick="alert(1)">Hi</p><script>alert(1)</script><img src="x" onerror="alert(1)">`;
    const clean = sanitizeStoryHtml(dirty);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).not.toMatch(/onerror/i);
    expect(clean).toContain("<p");
  });

  it("binds images in document order to asset URLs", () => {
    const html = `<p>one</p><img src="data:a"><p>two</p><img src="data:b">`;
    const bound = applyStoryAssets(html, [
      { mediaUrl: "https://cdn.example/a.jpg" },
      { mediaUrl: "https://cdn.example/b.jpg" },
    ]);
    expect(bound).toContain('src="https://cdn.example/a.jpg"');
    expect(bound).toContain('src="https://cdn.example/b.jpg"');
    expect(bound.indexOf("a.jpg")).toBeLessThan(bound.indexOf("b.jpg"));
    expect(bound).toContain("data-story-asset=\"0\"");
    expect(bound).toContain("data-story-asset=\"1\"");
    expect(bound).toContain("<p>one</p>");
    expect(bound).toContain("<p>two</p>");
  });

  it("counts img tags", () => {
    expect(countStoryImages("<p>x</p>")).toBe(0);
    expect(countStoryImages('<p><img src="a"><img src="b"></p>')).toBe(2);
  });
});
