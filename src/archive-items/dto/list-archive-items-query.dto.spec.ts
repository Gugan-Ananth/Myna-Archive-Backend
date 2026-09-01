import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { ListArchiveItemsQueryDto } from "./list-archive-items-query.dto";

const implicit = { enableImplicitConversion: true as const };

describe("ListArchiveItemsQueryDto", () => {
  it('parses imageGroup=false from the homepage photos query', () => {
    const dto = plainToInstance(
      ListArchiveItemsQueryDto,
      {
        mediaType: "image",
        imageGroup: "false",
        page: "1",
        pageSize: "40",
      },
      implicit,
    );

    expect(dto.imageGroup).toBe(false);
    expect(dto.mediaType).toBe("image");
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(40);
  });

  it("parses imageGroup=true for collections", () => {
    const dto = plainToInstance(
      ListArchiveItemsQueryDto,
      { mediaType: "image", imageGroup: "true" },
      implicit,
    );
    expect(dto.imageGroup).toBe(true);
  });

  it("parses the Cute Things section", () => {
    const dto = plainToInstance(
      ListArchiveItemsQueryDto,
      { mediaType: "image", section: "cute-things" },
      implicit,
    );
    expect(dto.section).toBe("cute-things");
  });

  it("parses starred=true", () => {
    const dto = plainToInstance(
      ListArchiveItemsQueryDto,
      { mediaType: "image", starred: "true" },
      implicit,
    );
    expect(dto.starred).toBe(true);
  });

  it("leaves imageGroup unset when omitted", () => {
    const dto = plainToInstance(
      ListArchiveItemsQueryDto,
      { mediaType: "image" },
      implicit,
    );
    expect(dto.imageGroup).toBeUndefined();
  });

  it("parses storyRoot=true without flipping other flags", () => {
    const dto = plainToInstance(
      ListArchiveItemsQueryDto,
      { mediaType: "story", storyRoot: "true" },
      implicit,
    );
    expect(dto.storyRoot).toBe(true);
    expect(dto.imageGroup).toBeUndefined();
  });
});
