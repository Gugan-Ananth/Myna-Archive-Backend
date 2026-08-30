import "reflect-metadata";
import { plainToInstance, Transform } from "class-transformer";
import { toOptionalBoolean, transformQueryBoolean } from "./query-boolean";

describe("toOptionalBoolean", () => {
  it.each([
    [true, true],
    ["true", true],
    ["1", true],
    [1, true],
    [false, false],
    ["false", false],
    ["0", false],
    [0, false],
    ["yes", undefined],
    ["", undefined],
    [null, undefined],
    [undefined, undefined],
  ])("parses %p as %p", (input, expected) => {
    expect(toOptionalBoolean(input)).toBe(expected);
  });

  it("uses the last value when the query param is repeated", () => {
    expect(toOptionalBoolean(["true", "false"])).toBe(false);
  });
});

class FlagDto {
  @Transform(transformQueryBoolean)
  imageGroup?: boolean;
}

describe("transformQueryBoolean", () => {
  const options = { enableImplicitConversion: true as const };

  it('keeps query string "false" as false under implicit conversion', () => {
    const dto = plainToInstance(
      FlagDto,
      { imageGroup: "false" },
      options,
    );
    expect(dto.imageGroup).toBe(false);
  });

  it('keeps query string "true" as true under implicit conversion', () => {
    const dto = plainToInstance(FlagDto, { imageGroup: "true" }, options);
    expect(dto.imageGroup).toBe(true);
  });
});
