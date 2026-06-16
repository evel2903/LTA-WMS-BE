import { UserEntity } from '../Entities/UserEntity';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  FindById(id: string): Promise<UserEntity | null>;
  FindByEmail(emailAddress: string): Promise<UserEntity | null>;
  Create(user: UserEntity): Promise<UserEntity>;
  Update(user: UserEntity): Promise<void>;
  Delete(id: string): Promise<void>;
  List(skip: number, take: number): Promise<{ Items: UserEntity[]; TotalItems: number }>;
}
