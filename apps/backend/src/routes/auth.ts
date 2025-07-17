import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma-client';
import { ApiResponse } from '@parkml/shared';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name || !role) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields',
      };
      return res.status(400).json(response);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const response: ApiResponse = {
        success: false,
        error: 'User already exists',
      };
      return res.status(400).json(response);
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      const response: ApiResponse = {
        success: false,
        error: 'Email and password are required',
      };
      return res.status(400).json(response);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid credentials',
      };
      return res.status(401).json(response);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid credentials',
      };
      return res.status(401).json(response);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});

export default router;