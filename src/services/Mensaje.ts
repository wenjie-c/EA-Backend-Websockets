import { Server as SocketIOServer, Socket } from 'socket.io';
import Logging from '../library/Logging';
import MensajeModel, { IMensajeModel } from '../models/Mensaje';
import { Handshake } from '../models/Handshake';
import { isObjectIdOrHexString } from 'mongoose';

export class MensajeService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Inicializa los listeners de Socket.io
   */
  public inicializarSockets(): void {
    let connectionList: Handshake[] = []; //{};
    this.io.on('connection', (socket: Socket) => {
      Logging.info(`Socket conectado: ${socket.id}`);

      /* 
            // Unirse a una sala de organización (DESACTIVADO PARA CHAT GLOBAL)
            socket.on('join-organization', (organizacionId: string) => {
                socket.join(`org-${organizacionId}`);
                Logging.info(`Socket ${socket.id} se unió a organización ${organizacionId}`);
            });
            */

      socket.on('typing', (data: { usuario: string }) => {
        Logging.info(`${data.usuario} está escribiendo...`);
        socket.broadcast.emit('user-typing', data);
      });

      socket.on('stop-typing', (data: { usuario: string }) => {
        Logging.info(`${data.usuario} dejó de escribir`);
        socket.broadcast.emit('user-stop-typing', data);
      });

      // Escuchar mensajes incoming
      socket.on('message', async (data: { usuario: string; organizacion: string; contenido: string }) => {
        try {
          Logging.info(`Mensaje recibido de ${data.usuario}`);

          // Guardar el mensaje en la BD
          const nuevoMensaje = await this.guardarMensaje(data.contenido, data.usuario, data.organizacion);

          // Emitir el mensaje a TODOS los clientes conectados (Chat Global)
          this.io.emit('message', nuevoMensaje);
        } catch (error) {
          Logging.error(`Error al guardar mensaje: ${error}`);
          socket.emit('error', { message: 'Error al guardar el mensaje' });
        }
      });

      // Marcar mensaje como leído
      socket.on('mark-as-read', async (mensajeId: string) => {
        try {
          await MensajeModel.findByIdAndUpdate(mensajeId, { leido: true });
          Logging.info(`Mensaje ${mensajeId} marcado como leído`);
        } catch (error) {
          Logging.error(`Error al marcar mensaje como leído: ${error}`);
        }
      });

      // Desconexión
      socket.on('disconnect', () => {
        Logging.info(`Socket desconectado: ${socket.id}`);
        /*
        let index: number = connectionList.findIndex(function (value) {
          Logging.log(`Analizando usuario: ${value.userName}`);
          return value.socketId === socket.id;
        });
        
        Logging.log(`Eliminando el usuario ${index}`);
        delete connectionList[index]; // se marcha
        */
        connectionList = connectionList.filter(function (value) {
          return value.socketId !== socket.id;
        });
      });

      // Mi propia lógica
      socket.on('handshake', function (data: Handshake) {
        Logging.log(`Welcome ${data.userName}`);
        data.socketId = socket.id;
        connectionList.push(data);
        socket.emit('list', connectionList);
      });
      socket.on('list', function () {
        socket.emit('list', connectionList);
      });
    });
  }

  /**
   * Guarda un nuevo mensaje en la base de datos
   */
  public async guardarMensaje(contenido: string, usuarioId: string, organizacionId: string): Promise<IMensajeModel> {
    const mensaje = new MensajeModel({
      contenido,
      usuario: usuarioId,
      organizacion: organizacionId,
      leido: false
    });

    const savedMensaje = await mensaje.save();
    return await savedMensaje.populate('usuario', 'name email');
  }

  /**
   * Obtiene todos los mensajes de una organización
   */
  public async obtenerMensajesPorOrganizacion(organizacionId: string): Promise<IMensajeModel[]> {
    return await MensajeModel.find({ organizacion: organizacionId }).populate('usuario', 'name email').sort({ createdAt: -1 });
  }

  /**
   * Obtiene los mensajes no leídos de un usuario
   */
  public async obtenerMensajesNoLeidos(usuarioId: string): Promise<IMensajeModel[]> {
    return await MensajeModel.find({ usuario: usuarioId, leido: false }).populate('usuario', 'name email').populate('organizacion', 'name');
  }
}
