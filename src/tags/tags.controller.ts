import { Controller, Get, Query } from "@nestjs/common";
import { ListTagsQueryDto } from "./dto/list-tags-query.dto";
import type { TagsListResponse } from "./dto/tag-summary.dto";
import { TagsService } from "./tags.service";

@Controller("tags")
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(@Query() query: ListTagsQueryDto): Promise<TagsListResponse> {
    const data = await this.tagsService.listSummaries(query);
    return { data };
  }
}
