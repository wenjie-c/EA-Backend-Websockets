import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/config';

export interface IUsuario {
    name: string;
    email: string;
    password: string;
    organizacion: mongoose.Types.ObjectId | string;
    encryptPassword(password: string): Promise<string>;
    validatePassword(password: string): Promise<boolean>;
}

export interface IUsuarioModel extends IUsuario, Document {
    createdAt: Date;
}

const UsuarioSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        organizacion: { type: Schema.Types.ObjectId, required: true, ref: 'Organizacion' }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

UsuarioSchema.methods.encryptPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

UsuarioSchema.methods.validatePassword = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
};

export default mongoose.model<IUsuarioModel>('Usuario', UsuarioSchema);
