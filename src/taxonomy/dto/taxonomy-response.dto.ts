export type TaxonomyTagDto = {
  slug: string;
  label: string;
  builtIn: boolean;
  /** How many archive items currently use `category:tag`. */
  count: number;
};

export type TaxonomyCategoryDto = {
  slug: string;
  label: string;
  builtIn: boolean;
  tags: TaxonomyTagDto[];
};

export type TaxonomyListResponse = {
  data: TaxonomyCategoryDto[];
};

export type TaxonomyCategoryResponse = {
  data: TaxonomyCategoryDto;
};

export type TaxonomyTagResponse = {
  data: {
    categorySlug: string;
    tag: TaxonomyTagDto;
  };
};
