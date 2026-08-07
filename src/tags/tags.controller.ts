import { Controller, Get } from "@nestjs/common";
import type { TagsListResponse } from "./dto/tag-summary.dto";
import { TagsService } from "./tags.service";

@Controller("tags")
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(): Promise<TagsListResponse> {
    const data = await this.tagsService.listSummaries();
    return { data };
  }
}
