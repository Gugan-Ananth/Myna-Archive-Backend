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
import { CreateOriginalCharacterDto } from "./dto/create-original-character.dto";
import { ListOriginalCharactersQueryDto } from "./dto/list-original-characters-query.dto";
import type {
  OriginalCharacterResponse,
  PaginatedOriginalCharactersResponse,
} from "./dto/original-character-response.dto";
import { UpdateOriginalCharacterDto } from "./dto/update-original-character.dto";
import { OriginalCharactersService } from "./original-characters.service";

@Controller("original-characters")
export class OriginalCharactersController {
  constructor(private readonly ocs: OriginalCharactersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateOriginalCharacterDto,
  ): Promise<OriginalCharacterResponse> {
    return this.ocs.create(dto);
  }

  @Get()
  findAll(
    @Query() query: ListOriginalCharactersQueryDto,
  ): Promise<PaginatedOriginalCharactersResponse> {
    return this.ocs.findAll(query);
  }

  @Get(":id")
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<OriginalCharacterResponse> {
    return this.ocs.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOriginalCharacterDto,
  ): Promise<OriginalCharacterResponse> {
    return this.ocs.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.ocs.remove(id);
  }
}
