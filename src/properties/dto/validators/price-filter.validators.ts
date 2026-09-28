import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * A price-related value requires `currency` to be set on the same object.
 * `isPriceRelated` decides whether the *current* decorated value counts as
 * "price-related" for the purpose of this rule:
 * - `priceMin`/`priceMax` use the default predicate (any defined value is
 *   price-related).
 * - `sort` passes a predicate that only matches `'price_asc'`/`'price_desc'`,
 *   so `sort=newest` never requires `currency`.
 */
export function RequiresCurrency(
  isPriceRelated: (value: unknown) => boolean = (value) => value !== undefined,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'requiresCurrency',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (!isPriceRelated(value)) {
            return true;
          }
          const relatedObject = args.object as Record<string, unknown>;
          return relatedObject.currency !== undefined;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} requires currency to be set`;
        },
      },
    });
  };
}

/**
 * Fails when the decorated value is a number lower than the value of
 * `relatedPropertyName` on the same object. Passes when either value is
 * undefined or not a number (those cases are covered by other decorators).
 */
export function IsGreaterThanOrEqualTo(
  relatedPropertyName: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGreaterThanOrEqualTo',
      target: object.constructor,
      propertyName,
      constraints: [relatedPropertyName],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedProperty
          ];
          if (typeof value !== 'number' || typeof relatedValue !== 'number') {
            return true;
          }
          return value >= relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          return `${args.property} must be greater than or equal to ${relatedProperty}`;
        },
      },
    });
  };
}
