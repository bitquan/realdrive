import { io } from "socket.io-client";
const SOCKET_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
let activeSocket = null;
let activeToken = "";
export function getSocket(token) {
    if (activeSocket && activeToken === token) {
        return activeSocket;
    }
    activeSocket?.disconnect();
    activeToken = token;
    activeSocket = io(SOCKET_URL, {
        auth: {
            token
        }
    });
    return activeSocket;
}
export function disconnectSocket() {
    activeToken = "";
    activeSocket?.disconnect();
    activeSocket = null;
}
