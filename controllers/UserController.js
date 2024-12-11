import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class UserController {
    static async getMe(req, res) {
        const token = req.headers['x-token'];

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            // Fetch userId from Redis using the token
            const userId = await redisClient.get(`auth_${token}`);
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Find the user in DB using userId
            const user = await dbClient.db.collection('users').findOne({ _id: dbClient.getObjectId(userId) });

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Successfully found the user
            return res.status(200).json({ id: user._id, email: user.email });
        } catch (error) {
            console.error('Error in getMe:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export default UserController;
