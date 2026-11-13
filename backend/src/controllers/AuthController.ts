import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  AuthService,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '../services/AuthService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for authentication use cases.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public register = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body as RegisterInput);
    res.status(201).json({
      token: result.token,
      user: Serializer.user(result.user),
    });
  });

  public login = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body as LoginInput);
    res.status(200).json({
      token: result.token,
      user: Serializer.user(result.user),
    });
  });

  public me = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const user = await this.authService.getProfile(userId);
    res.status(200).json({ user: Serializer.user(user) });
  });

  public updateMe = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const user = await this.authService.updateProfile(userId, req.body as UpdateProfileInput);
    res.status(200).json({ user: Serializer.user(user) });
  });
}
