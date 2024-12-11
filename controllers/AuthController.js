import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db'
import sha1 from 'sha1';

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization || '';
    cont token = authHeader.split(' ')[1] || '';
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, password] = decoded.split(':');
    if (!email || !password) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const hashedPassword = sha1(password);
    const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const authToken = uuidv4();
    await redisClient.set(`auth_${authToken}`, user._id.toString(), 86400);
    return res.status(200).json({ token: authToken });
  }
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unautorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}
export default AuthController;
