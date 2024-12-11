import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Validate parentId
    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: dbClient.getObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDocument = {
      userId: dbClient.getObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? '0' : dbClient.getObjectId(parentId),
    };

    // Handle file storage for type=file|image
    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const filePath = path.join(folderPath, uuidv4());
      const fileData = Buffer.from(data, 'base64');
      fs.writeFileSync(filePath, fileData);

      fileDocument.localPath = filePath;
    }

    // Save file document in MongoDB
    const result = await dbClient.db.collection('files').insertOne(fileDocument);
    const createdFile = {
      id: result.insertedId.toString(),
      userId: userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
      ...(fileDocument.localPath && { localPath: fileDocument.localPath }),
    };

    return res.status(201).json(createdFile);
  }
}

export default FilesController;
