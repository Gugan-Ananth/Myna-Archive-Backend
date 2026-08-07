import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateTaxonomyTagDto } from "./dto/create-taxonomy-tag.dto";
import type {
  TaxonomyCategoryResponse,
  TaxonomyListResponse,
  TaxonomyTagResponse,
} from "./dto/taxonomy-response.dto";
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

  /** Create a user category (optional first tag). */
  @Post("categories")
  async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<TaxonomyCategoryResponse> {
    const data = await this.taxonomy.createCategory(dto);
    return { data };
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
}
