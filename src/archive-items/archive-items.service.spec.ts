import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BunnyService } from '../media/bunny.service';
import { ArchiveItemsService } from './archive-items.service';
import { ArchiveItemEntity } from './entities/archive-item.entity';

describe('ArchiveItemsService', () => {
  let service: ArchiveItemsService;

  const repository = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({
      id: '11111111-1111-1111-1111-111111111111',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...x,
    })),
    findOne: jest.fn(),
    remove: jest.fn(async () => undefined),
    createQueryBuilder: jest.fn(),
  };

  const bunny = {
    verifyAndDeriveUrls: jest.fn(),
    destroy: jest.fn(async () => undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveItemsService,
        { provide: getRepositoryToken(ArchiveItemEntity), useValue: repository },
        { provide: BunnyService, useValue: bunny },
      ],
    }).compile();

    service = module.get(ArchiveItemsService);
  });

  describe('create', () => {
    it('creates an archive item after Bunny verify', async () => {
      bunny.verifyAndDeriveUrls.mockResolvedValue({
        resource: {
          publicId: 'myna-archive/abc.jpg',
          resourceType: 'image',
          bytes: 1000,
          format: 'jpg',
        },
        urls: {
          mediaUrl: 'https://cdn.example.b-cdn.net/myna-archive/abc.jpg',
          thumbnailUrl:
            'https://cdn.example.b-cdn.net/myna-archive/abc.jpg?width=480&height=270',
        },
      });

      const result = await service.create({
        publicId: 'myna-archive/abc.jpg',
        resourceType: 'image',
        mediaType: 'image',
        name: 'Misty Lake',
        tags: ['#Landscape', 'fog'],
        rating: 9.5,
        description: 'Morning fog',
      });

      expect(bunny.verifyAndDeriveUrls).toHaveBeenCalled();
      expect(result.name).toBe('Misty Lake');
      expect(result.tags).toEqual(['landscape', 'fog']);
      expect(result.mediaType).toBe('image');
      expect(result.mediaUrl).toContain('b-cdn.net');
    });

    it('rejects when tags normalize to empty', async () => {
      await expect(
        service.create({
          publicId: 'myna-archive/abc.jpg',
          resourceType: 'image',
          mediaType: 'image',
          name: 'x',
          tags: ['#', '  '],
          rating: 5,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('throws NotFound when missing', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(
        service.findOne('11111111-1111-1111-1111-111111111111'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('destroys Bunny asset then deletes row', async () => {
      repository.findOne.mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        publicId: 'myna-archive/abc.jpg',
        resourceType: 'image',
        name: 'x',
        description: '',
        tags: ['a'],
        rating: 1,
        mediaType: 'image',
        thumbnailUrl: 't',
        mediaUrl: 'm',
      });

      await service.remove('11111111-1111-1111-1111-111111111111');

      expect(bunny.destroy).toHaveBeenCalledWith(
        'myna-archive/abc.jpg',
        'image',
      );
      expect(repository.remove).toHaveBeenCalled();
    });
  });
});
