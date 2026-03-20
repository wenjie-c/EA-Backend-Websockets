import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import UsuarioService from '../services/Usuario';
import Usuario, { IUsuario } from '../models/Usuario';
import { string, Types } from 'joi';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

const createUsuario = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const savedUsuario = await UsuarioService.createUsuario(req.body);
        return res.status(201).json(savedUsuario);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

const readUsuario = async (req: Request, res: Response, next: NextFunction) => {
    const usuarioId = req.params.usuarioId;

    try {
        const usuario = await UsuarioService.getUsuario(usuarioId);
        return usuario ? res.status(200).json(usuario) : res.status(404).json({ message: 'not found' });
    } catch (error) {
        return res.status(500).json({ error });
    }
};

const readAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuarios = await UsuarioService.getAllUsuarios();
        return res.status(200).json(usuarios);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

const updateUsuario = async (req: Request, res: Response, next: NextFunction) => {
    const usuarioId = req.params.usuarioId;
    try {
        const updatedUsuario = await UsuarioService.updateUsuario(usuarioId, req.body);
        return updatedUsuario ? res.status(201).json(updatedUsuario) : res.status(404).json({ message: 'not found' });
    } catch (error) {
        return res.status(500).json({ error });
    }
};

const deleteUsuario = async (req: Request, res: Response, next: NextFunction) => {
    const usuarioId = req.params.usuarioId;

    try {
        const usuario = await UsuarioService.deleteUsuario(usuarioId);
        return usuario ? res.status(201).json(usuario) : res.status(404).json({ message: 'not found' });
    } catch (error) {
        return res.status(500).json({ error });
    }
};

async function singup(req: Request, res: Response) {
    const user = new Usuario({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        organizacion: req.body.organizacion
    });

    user.password = await user.encryptPassword(user.password);
    const savedUser = await user.save();

    const token: string = jwt.sign({ _id: savedUser._id }, config.jwt.sk);
    return res.header('auth-token', token).status(201).json(savedUser);
}

async function login(req: Request, res: Response) {
    const user = await Usuario.findOne({ email: req.body.email });
    if (!user) return res.status(400).json('User with this email couldnt be found');
    const isPasswordCorrect: boolean = await user.validatePassword(req.body.password);
    if (!isPasswordCorrect) return res.status(400).json('Incorrect password');

    const token: string = jwt.sign({ _id: user._id }, config.jwt.sk, {
        expiresIn: '15m'
    });

    return res.status(200).header('auth-token', token).json(user);
}

export default { createUsuario, readUsuario, readAll, updateUsuario, deleteUsuario, singup, login };
