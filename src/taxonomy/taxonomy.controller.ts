import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateTaxonomyTagDto } from "./dto/create-taxonomy-tag.dto";
import { ReorderTaxonomyDto } from "./dto/reorder-taxonomy.dto";
import type {
  TaxonomyCategoryResponse,
  TaxonomyListResponse,
  TaxonomyTagResponse,
} from "./dto/taxonomy-response.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateTaxonomyTagDto } from "./dto/update-taxonomy-tag.dto";
import { TaxonomyService } from "./taxonomy.service";

@Controller("taxonomy")
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  /** Full category → tag vocabulary with usage counts. */
  @Get()
  async list(): Promise<TaxonomyListResponse> {
    const data = await this.taxonomy.list();
    return { data };
  }

  /** Persist category and/or tag display order. */
  @Patch("reorder")
  async reorder(
    @Body() dto: ReorderTaxonomyDto,
  ): Promise<TaxonomyListResponse> {
    const data = await this.taxonomy.reorder(dto);
    return { data };
  }

  /** Create a user category (optional first tag). */
  @Post("categories")
  async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<TaxonomyCategoryResponse> {
    const data = await this.taxonomy.createCategory(dto);
    return { data };
  }

  @Patch("categories/:categorySlug")
  async updateCategory(
    @Param("categorySlug") categorySlug: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<TaxonomyCategoryResponse> {
    const data = await this.taxonomy.updateCategory(categorySlug, dto);
    return { data };
  }

  @Delete("categories/:categorySlug")
  @HttpCode(204)
  async deleteCategory(
    @Param("categorySlug") categorySlug: string,
  ): Promise<void> {
    await this.taxonomy.deleteCategory(categorySlug);
  }

  /** Add a tag under a category (Others flow). */
  @Post("categories/:categorySlug/tags")
  async createTag(
    @Param("categorySlug") categorySlug: string,
    @Body() dto: CreateTaxonomyTagDto,
  ): Promise<TaxonomyTagResponse> {
    const data = await this.taxonomy.createTag(categorySlug, dto);
    return { data };
  }

  @Patch("categories/:categorySlug/tags/:tagSlug")
  async updateTag(
    @Param("categorySlug") categorySlug: string,
    @Param("tagSlug") tagSlug: string,
    @Body() dto: UpdateTaxonomyTagDto,
  ): Promise<TaxonomyTagResponse> {
    const data = await this.taxonomy.updateTag(categorySlug, tagSlug, dto);
    return { data };
  }

  @Delete("categories/:categorySlug/tags/:tagSlug")
  @HttpCode(204)
  async deleteTag(
    @Param("categorySlug") categorySlug: string,
    @Param("tagSlug") tagSlug: string,
  ): Promise<void> {
    await this.taxonomy.deleteTag(categorySlug, tagSlug);
  }
}
