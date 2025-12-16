import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createCommand, getCommands } from '../../controllers/audioCommandController.js';
import * as userModel from '../../models/user.js';
import * as audioCommandModel from '../../models/audioCommand.js';
import * as fileUploadService from '../../services/fileUpload.js';
import * as twitchChatService from '../../services/twitchChat.js';

// Mock dependencies
jest.mock('../../models/user.js');
jest.mock('../../models/audioCommand.js');
jest.mock('../../services/fileUpload.js');
jest.mock('../../services/twitchChat.js', () => ({
  reloadCommandHandlers: jest.fn()
}));

describe('Audio Command Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCommand', () => {
    it('should return 401 if not authenticated', async () => {
      const req = {
        session: {},
        body: { command: '!test' },
        file: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createCommand(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return 400 if command is missing', async () => {
      const req = {
        session: { userId: '12345' },
        body: {},
        file: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createCommand(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Command is required' });
    });

    it('should return 404 if user not found in database', async () => {
      userModel.getUserByTwitchId.mockResolvedValue(null);

      const req = {
        session: { userId: '12345' },
        body: { command: '!test' },
        file: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createCommand(req, res);

      expect(userModel.getUserByTwitchId).toHaveBeenCalledWith('12345');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 400 if neither file nor URL provided', async () => {
      userModel.getUserByTwitchId.mockResolvedValue({ id: 1, twitch_user_id: '12345' });

      const req = {
        session: { userId: '12345' },
        body: { command: '!test' },
        file: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createCommand(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Either a file or URL must be provided' });
    });

    it('should create command successfully with file upload', async () => {
      const mockUser = { id: 1, twitch_user_id: '12345' };
      const mockFile = {
        path: '/uploads/audio/test.mp3',
        size: 100000
      };
      const mockCommand = {
        id: 1,
        command: '!test',
        file_path: '/uploads/audio/test.mp3',
        file_size: 100000,
        volume: 0.5
      };

      userModel.getUserByTwitchId.mockResolvedValue(mockUser);
      audioCommandModel.createAudioCommand.mockResolvedValue(mockCommand);

      const req = {
        session: { userId: '12345' },
        body: { command: '!test', volume: 0.5 },
        file: mockFile
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createCommand(req, res);

      expect(audioCommandModel.createAudioCommand).toHaveBeenCalledWith({
        userId: 1,
        twitchUserId: '12345',
        command: '!test',
        filePath: '/uploads/audio/test.mp3',
        fileUrl: null,
        fileSize: 100000,
        volume: 0.5
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        audioCommand: mockCommand
      });
    });

    it('should create command successfully with URL', async () => {
      const mockUser = { id: 1, twitch_user_id: '12345' };
      const mockCommand = {
        id: 1,
        command: '!test',
        file_path: '/uploads/audio/downloaded.mp3',
        file_size: 50000,
        volume: 0.5
      };

      userModel.getUserByTwitchId.mockResolvedValue(mockUser);
      fileUploadService.downloadAudioFromUrl = jest.fn().mockResolvedValue({
        filePath: '/uploads/audio/downloaded.mp3',
        fileSize: 50000
      });
      
      audioCommandModel.createAudioCommand.mockResolvedValue(mockCommand);

      const req = {
        session: { userId: '12345' },
        body: { command: '!test', fileUrl: 'https://example.com/sound.mp3', volume: 0.5 },
        file: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createCommand(req, res);

      expect(fileUploadService.downloadAudioFromUrl).toHaveBeenCalledWith('https://example.com/sound.mp3', 1);
      expect(audioCommandModel.createAudioCommand).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        audioCommand: mockCommand
      });
    });
  });

  describe('getCommands', () => {
    it('should return 401 if not authenticated', async () => {
      const req = {
        session: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getCommands(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return 404 if user not found', async () => {
      userModel.getUserByTwitchId.mockResolvedValue(null);

      const req = {
        session: { userId: '12345' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getCommands(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return commands for authenticated user', async () => {
      const mockUser = { id: 1, twitch_user_id: '12345' };
      const mockCommands = [
        { id: 1, command: '!test1', file_path: '/path1.mp3' },
        { id: 2, command: '!test2', file_path: '/path2.mp3' }
      ];

      userModel.getUserByTwitchId.mockResolvedValue(mockUser);
      audioCommandModel.getAudioCommandsByUserId.mockResolvedValue(mockCommands);

      const req = {
        session: { userId: '12345' }
      };
      const res = {
        json: jest.fn()
      };

      await getCommands(req, res);

      expect(audioCommandModel.getAudioCommandsByUserId).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        commands: mockCommands
      });
    });
  });

});

