import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { UserController } from '../../../src/Modules/Users/Presentation/Controllers/UserController';
import { CreateUserUseCase } from '../../../src/Modules/Users/Application/UseCases/CreateUserUseCase';
import { DeleteUserUseCase } from '../../../src/Modules/Users/Application/UseCases/DeleteUserUseCase';
import { GetUserByIdUseCase } from '../../../src/Modules/Users/Application/UseCases/GetUserByIdUseCase';
import { ListUsersUseCase } from '../../../src/Modules/Users/Application/UseCases/ListUsersUseCase';
import { UpdateUserUseCase } from '../../../src/Modules/Users/Application/UseCases/UpdateUserUseCase';

describe('E2E UserController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getByIdExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();
  const deleteExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: CreateUserUseCase, useValue: { Execute: createExecute } },
        { provide: GetUserByIdUseCase, useValue: { Execute: getByIdExecute } },
        { provide: ListUsersUseCase, useValue: { Execute: listExecute } },
        { provide: UpdateUserUseCase, useValue: { Execute: updateExecute } },
        { provide: DeleteUserUseCase, useValue: { Execute: deleteExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createExecute.mockReset();
    getByIdExecute.mockReset();
    listExecute.mockReset();
    updateExecute.mockReset();
    deleteExecute.mockReset();
  });

  it('POST /users returns 400 on invalid body', async () => {
    await request(app.getHttpServer()).post('/users').send({ FirstName: 'A' }).expect(400);
    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /users calls use case on valid body', async () => {
    createExecute.mockResolvedValue({
      Id: 'u1',
      FirstName: 'A',
      LastName: 'B',
      EmailAddress: 'a@b.com',
      CreatedAt: new Date().toISOString(),
    });

    await request(app.getHttpServer())
      .post('/users')
      .send({ FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.com' })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith({ FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.com' });
  });

  it('GET /users/:id calls use case', async () => {
    getByIdExecute.mockResolvedValue({
      Id: 'u1',
      FirstName: 'A',
      LastName: 'B',
      EmailAddress: 'a@b.com',
      CreatedAt: 'x',
    });
    await request(app.getHttpServer()).get('/users/u1').expect(200);
    expect(getByIdExecute).toHaveBeenCalledWith('u1');
  });
});
