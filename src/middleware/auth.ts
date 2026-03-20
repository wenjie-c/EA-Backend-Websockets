import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

interface IPayload {
  _id: string;
  iat: number;
  exp: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  //const token = req.header('auth-token');
  const authHeader = req.headers['authorization']; // Para leer el header de la peticion, la parte de Authorization

  const token = authHeader && authHeader.split(' ')[1]; // Aqui separa el token del header
  if (!token) return res.status(401).json('Acess denied');

  const payload = jwt.verify(token, config.jwt.sk) as IPayload;
  req.userId = payload._id;
  next();
};
