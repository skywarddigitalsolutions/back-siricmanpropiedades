import {
  ImageCapExceededError,
  NewPropertyImage,
  NotAPermutationError,
  PropertyImagesRepository,
  PropertyNotFoundError,
} from './property-images.repository';

function makeFakeRepository() {
  return {
    count: jest.fn(),
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: unknown) => data),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
}

describe('PropertyImagesRepository', () => {
  let repository: PropertyImagesRepository;
  let imageRepo: ReturnType<typeof makeFakeRepository>;
  let readManager: { query: jest.Mock; getRepository: jest.Mock };
  let txManager: { query: jest.Mock; getRepository: jest.Mock };
  let dataSource: { manager: typeof readManager; transaction: jest.Mock };

  beforeEach(() => {
    imageRepo = makeFakeRepository();
    readManager = {
      query: jest.fn(),
      getRepository: jest.fn(() => imageRepo),
    };
    txManager = {
      query: jest.fn().mockResolvedValue([{ lock: 1 }]),
      getRepository: jest.fn(() => imageRepo),
    };
    dataSource = {
      manager: readManager,
      transaction: jest.fn(async (cb: (m: unknown) => unknown) =>
        cb(txManager),
      ),
    };

    repository = new PropertyImagesRepository(dataSource as any);
  });

  describe('propertyExists', () => {
    it('returns true when the property row exists', async () => {
      readManager.query.mockResolvedValueOnce([{ exists: 1 }]);

      await expect(repository.propertyExists('prop-1')).resolves.toBe(true);
      expect(readManager.query).toHaveBeenCalledWith(
        'SELECT 1 FROM properties WHERE id = $1',
        ['prop-1'],
      );
    });

    it('returns false when the property row does not exist', async () => {
      readManager.query.mockResolvedValueOnce([]);

      await expect(repository.propertyExists('prop-1')).resolves.toBe(false);
    });
  });

  describe('countByProperty', () => {
    it('returns the image count for the property', async () => {
      imageRepo.count.mockResolvedValueOnce(3);

      await expect(repository.countByProperty('prop-1')).resolves.toBe(3);
      expect(imageRepo.count).toHaveBeenCalledWith({
        where: { propertyId: 'prop-1' },
      });
    });
  });

  describe('insertAppended', () => {
    const newImage: NewPropertyImage = {
      id: 'img-1',
      propertyId: 'prop-1',
      largeKey: 'properties/prop-1/img-1-lg.webp',
      thumbKey: 'properties/prop-1/img-1-thumb.webp',
      width: 1920,
      height: 1080,
      thumbWidth: 480,
      thumbHeight: 270,
      largeBytes: 100_000,
      thumbBytes: 20_000,
    };

    it('locks the property row before counting or inserting', async () => {
      imageRepo.count.mockResolvedValueOnce(0);

      await repository.insertAppended(newImage, 30);

      expect(txManager.query).toHaveBeenCalledWith(
        'SELECT 1 FROM properties WHERE id = $1 FOR UPDATE',
        ['prop-1'],
      );
      expect(txManager.query.mock.invocationCallOrder[0]).toBeLessThan(
        imageRepo.count.mock.invocationCallOrder[0],
      );
    });

    it('rejects with PropertyNotFoundError when the lock finds no property row', async () => {
      txManager.query.mockResolvedValueOnce([]);

      await expect(repository.insertAppended(newImage, 30)).rejects.toThrow(
        PropertyNotFoundError,
      );
      expect(imageRepo.count).not.toHaveBeenCalled();
    });

    it('rejects with ImageCapExceededError when the property already has the max images', async () => {
      imageRepo.count.mockResolvedValueOnce(30);

      await expect(repository.insertAppended(newImage, 30)).rejects.toThrow(
        ImageCapExceededError,
      );
      expect(imageRepo.create).not.toHaveBeenCalled();
    });

    it('inserts the new row at position = count', async () => {
      imageRepo.count.mockResolvedValueOnce(2);

      const result = await repository.insertAppended(newImage, 30);

      expect(imageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...newImage, position: 2 }),
      );
      expect(imageRepo.save).toHaveBeenCalled();
      expect((result as unknown as { position: number }).position).toBe(2);
    });
  });

  describe('reorder', () => {
    const currentRows = [
      { id: 'a', position: 0 },
      { id: 'b', position: 1 },
      { id: 'c', position: 2 },
    ];

    it('locks the property row before reading current images', async () => {
      imageRepo.find.mockResolvedValueOnce(currentRows);

      await repository.reorder('prop-1', ['a', 'b', 'c']);

      expect(txManager.query.mock.invocationCallOrder[0]).toBeLessThan(
        imageRepo.find.mock.invocationCallOrder[0],
      );
    });

    it('rejects with PropertyNotFoundError when the lock finds no property row', async () => {
      txManager.query.mockResolvedValueOnce([]);

      await expect(
        repository.reorder('prop-1', ['a', 'b', 'c']),
      ).rejects.toThrow(PropertyNotFoundError);
      expect(imageRepo.find).not.toHaveBeenCalled();
    });

    it('rejects with NotAPermutationError on wrong length', async () => {
      imageRepo.find.mockResolvedValueOnce(currentRows);

      await expect(repository.reorder('prop-1', ['a', 'b'])).rejects.toThrow(
        NotAPermutationError,
      );
    });

    it('rejects with NotAPermutationError on a duplicated id', async () => {
      imageRepo.find.mockResolvedValueOnce(currentRows);

      await expect(
        repository.reorder('prop-1', ['a', 'a', 'c']),
      ).rejects.toThrow(NotAPermutationError);
    });

    it('rejects with NotAPermutationError on a foreign id', async () => {
      imageRepo.find.mockResolvedValueOnce(currentRows);

      await expect(
        repository.reorder('prop-1', ['a', 'b', 'foreign-id']),
      ).rejects.toThrow(NotAPermutationError);
    });

    it('rejects with NotAPermutationError when a current id is missing', async () => {
      imageRepo.find.mockResolvedValueOnce(currentRows);

      await expect(
        repository.reorder('prop-1', ['a', 'b', 'd']),
      ).rejects.toThrow(NotAPermutationError);
    });

    it('is a no-op (no UPDATE issued) when the submitted order equals the current order', async () => {
      imageRepo.find.mockResolvedValueOnce(currentRows);

      const result = await repository.reorder('prop-1', ['a', 'b', 'c']);

      // Only the lock query — no reorder UPDATE.
      expect(txManager.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(currentRows);
    });

    it('issues exactly one UPDATE ... WITH ORDINALITY when the order changes', async () => {
      const reordered = [
        { id: 'c', position: 0 },
        { id: 'a', position: 1 },
        { id: 'b', position: 2 },
      ];
      imageRepo.find
        .mockResolvedValueOnce(currentRows)
        .mockResolvedValueOnce(reordered);

      const result = await repository.reorder('prop-1', ['c', 'a', 'b']);

      expect(txManager.query).toHaveBeenCalledTimes(2);
      expect(txManager.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('WITH ORDINALITY'),
        [['c', 'a', 'b'], 'prop-1'],
      );
      expect(result).toEqual(reordered);
    });
  });

  describe('deleteAndCompact', () => {
    it('locks the property row before looking up the image', async () => {
      imageRepo.findOne.mockResolvedValueOnce(null);

      await repository.deleteAndCompact('prop-1', 'img-1');

      expect(txManager.query.mock.invocationCallOrder[0]).toBeLessThan(
        imageRepo.findOne.mock.invocationCallOrder[0],
      );
    });

    it('returns null when the image id does not belong to that property', async () => {
      imageRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        repository.deleteAndCompact('prop-1', 'img-1'),
      ).resolves.toBeNull();
      expect(imageRepo.delete).not.toHaveBeenCalled();
    });

    it('returns null when the property row does not exist (lock finds nothing)', async () => {
      txManager.query.mockResolvedValueOnce([]);

      await expect(
        repository.deleteAndCompact('prop-1', 'img-1'),
      ).resolves.toBeNull();
      expect(imageRepo.findOne).not.toHaveBeenCalled();
    });

    it('deletes the row and issues exactly one compaction UPDATE', async () => {
      imageRepo.findOne.mockResolvedValueOnce({ id: 'img-2', position: 2 });

      const result = await repository.deleteAndCompact('prop-1', 'img-2');

      expect(imageRepo.delete).toHaveBeenCalledWith('img-2');
      expect(txManager.query).toHaveBeenCalledTimes(2);
      expect(txManager.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('position = position - 1'),
        ['prop-1', 2],
      );
      expect(result).toEqual({ id: 'img-2', position: 2 });
    });
  });

  describe('findByPropertyId', () => {
    it('queries ordered by position ascending', async () => {
      imageRepo.find.mockResolvedValueOnce([]);

      await repository.findByPropertyId('prop-1');

      expect(imageRepo.find).toHaveBeenCalledWith({
        where: { propertyId: 'prop-1' },
        order: { position: 'ASC' },
      });
    });
  });

  describe('findCoversByPropertyIds', () => {
    it('queries only position-0 images for the given property ids', async () => {
      imageRepo.find.mockResolvedValueOnce([]);

      await repository.findCoversByPropertyIds(['prop-1', 'prop-2']);

      expect(imageRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ position: 0 }),
        }),
      );
    });

    it('returns an empty array without querying when given no ids', async () => {
      const result = await repository.findCoversByPropertyIds([]);

      expect(result).toEqual([]);
      expect(imageRepo.find).not.toHaveBeenCalled();
    });
  });
});
