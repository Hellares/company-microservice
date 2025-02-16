export class BusinessError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

export class DuplicateEntityError extends BusinessError {
  constructor(entity: string) {
    super(`Ya existe un ${entity} con ese nombre o slug`, 'DUPLICATE_ENTITY');
  }
}

export class NotFoundError extends BusinessError {
  constructor(entity: string) {
    super(`${entity} no encontrado`, 'NOT_FOUND');
  }
}

export class ConflictError extends BusinessError {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}