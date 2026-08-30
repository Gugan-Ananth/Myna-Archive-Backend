import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { ListTagsQueryDto } from "./list-tags-query.dto";

describe("ListTagsQueryDto", () => {
  it('parses imageGroup=false for the photos tag vocabulary', () => {
    const dto = plainToInstance(
      ListTagsQueryDto,
      { mediaType: "image", imageGroup: "false" },
      { enableImplicitConversion: true },
    );
    expect(dto.imageGroup).toBe(false);
    expect(dto.mediaType).toBe("image");
  });
});
