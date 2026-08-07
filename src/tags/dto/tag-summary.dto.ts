/** Collection tag vocabulary entry (ADR 0008). */
export type TagSummary = {
  tag: string;
  count: number;
};

export type TagsListResponse = {
  data: TagSummary[];
};
