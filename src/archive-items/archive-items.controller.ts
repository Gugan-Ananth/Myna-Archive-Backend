import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ArchiveItemsService } from "./archive-items.service";
import type {
  ArchiveItemResponse,
  PaginatedArchiveItemsResponse,
} from "./dto/archive-item-response.dto";
import { CreateArchiveItemDto } from "./dto/create-archive-item.dto";
import { ListArchiveItemsQueryDto } from "./dto/list-archive-items-query.dto";
import { UpdateArchiveItemDto } from "./dto/update-archive-item.dto";

@Controller("archive-items")
export class ArchiveItemsController {
  constructor(private readonly archiveItemsService: ArchiveItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateArchiveItemDto): Promise<ArchiveItemResponse> {
    return this.archiveItemsService.create(dto);
  }

  @Get()
  findAll(
    @Query() query: ListArchiveItemsQueryDto,
  ): Promise<PaginatedArchiveItemsResponse> {
    return this.archiveItemsService.findAll(query);
  }

  @Get(":id/chapters")
  listChapters(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<{ data: ArchiveItemResponse[] }> {
    return this.archiveItemsService.listChapters(id);
  }

  @Get(":id")
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ArchiveItemResponse> {
    return this.archiveItemsService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateArchiveItemDto,
  ): Promise<ArchiveItemResponse> {
    return this.archiveItemsService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.archiveItemsService.remove(id);
  }
}
