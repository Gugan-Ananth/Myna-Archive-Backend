import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateArchiveItemDto {
  @IsString()
  @MinLength(1)
  publicId!: string;

  @IsIn(['image', 'video'])
  resourceType!: 'image' | 'video';

  @IsIn(['image', 'video'])
  mediaType!: 'image' | 'video';

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  tags!: string[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
