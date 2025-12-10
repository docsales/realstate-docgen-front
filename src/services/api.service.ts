import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004';

export class Server {
  readonly tokenPrefix = 'Bearer';
  readonly apiUrl = API_URL;
  api = axios.create({
    baseURL: this.apiUrl,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    withCredentials: true,
  })

  constructor() { }
}

export const server = new Server();
