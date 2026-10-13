import type { ValidationError } from 'class-validator';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

export function formatValidationErrors(
  errors: ValidationError[],
): Record<string, unknown> {
  return errors.reduce<Record<string, unknown>>(
    (formatted, validationError) => {
      const messages = Object.values(validationError.constraints ?? {});
      formatted[validationError.property] = messages.length
        ? messages
        : validationError.children?.length
          ? formatValidationErrors(validationError.children)
          : [];
      return formatted;
    },
    {},
  );
}

export async function generateRandomPasswordHash(length = 16): Promise<string> {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]<>?';

  const buffer = randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars[buffer[i] % chars.length];
  }

  const salt = randomBytes(8).toString('hex');
  const hash = ((await scrypt(password, salt, 32)) as Buffer).toString('hex');

  return `${salt}.${hash}`;
}
