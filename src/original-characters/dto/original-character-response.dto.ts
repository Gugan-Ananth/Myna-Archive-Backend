import type { OriginalCharacterEntity } from "../entities/original-character.entity";

export type OriginalCharacterResponse = {
  id: string;
  name: string;
  age: string;
  likes: string;
  dislikes: string;
  background: string;
  additionalInfo: string;
  publicId: string;
  thumbnailUrl: string;
  mediaUrl: string;
  width: number | null;
  height: number | null;
  blurHash: string | null;
};

export type PaginatedOriginalCharactersResponse = {
  data: OriginalCharacterResponse[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function toOriginalCharacterResponse(
  entity: OriginalCharacterEntity,
): OriginalCharacterResponse {
  return {
    id: entity.id,
    name: entity.name,
    age: entity.age ?? "",
    likes: entity.likes ?? "",
    dislikes: entity.dislikes ?? "",
    background: entity.background ?? "",
    additionalInfo: entity.additionalInfo ?? "",
    publicId: entity.publicId,
    thumbnailUrl: entity.thumbnailUrl,
    mediaUrl: entity.mediaUrl,
    width: entity.width ?? null,
    height: entity.height ?? null,
    blurHash: entity.blurHash ?? null,
  };
}
