import { BadRequestException } from '@nestjs/common';
import { assertPublicationTransition } from './property-lifecycle';
import { PublicationStatus } from '../enums/property.enums';

describe('assertPublicationTransition', () => {
  const validCases: Array<{
    from: PublicationStatus;
    action: 'publish' | 'archive' | 'unpublish';
    to: PublicationStatus;
  }> = [
    {
      from: PublicationStatus.DRAFT,
      action: 'publish',
      to: PublicationStatus.PUBLISHED,
    },
    {
      from: PublicationStatus.ARCHIVED,
      action: 'publish',
      to: PublicationStatus.PUBLISHED,
    },
    {
      from: PublicationStatus.DRAFT,
      action: 'archive',
      to: PublicationStatus.ARCHIVED,
    },
    {
      from: PublicationStatus.PUBLISHED,
      action: 'archive',
      to: PublicationStatus.ARCHIVED,
    },
    {
      from: PublicationStatus.PUBLISHED,
      action: 'unpublish',
      to: PublicationStatus.DRAFT,
    },
    {
      from: PublicationStatus.ARCHIVED,
      action: 'unpublish',
      to: PublicationStatus.DRAFT,
    },
  ];

  const invalidCases: Array<{
    from: PublicationStatus;
    action: 'publish' | 'archive' | 'unpublish';
  }> = [
    { from: PublicationStatus.PUBLISHED, action: 'publish' },
    { from: PublicationStatus.ARCHIVED, action: 'archive' },
    { from: PublicationStatus.DRAFT, action: 'unpublish' },
  ];

  it.each(validCases)(
    '$action from $from returns $to',
    ({ from, action, to }) => {
      expect(assertPublicationTransition(from, action)).toBe(to);
    },
  );

  it.each(invalidCases)(
    '$action from $from throws BadRequestException naming the current status',
    ({ from, action }) => {
      expect(() => assertPublicationTransition(from, action)).toThrow(
        BadRequestException,
      );
      expect(() => assertPublicationTransition(from, action)).toThrow(from);
    },
  );
});
