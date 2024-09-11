import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middlewares/authMiddleware.js"; // JWT 인증 미들웨어

const router = express.Router();
const prisma = new PrismaClient();

// 캐릭터 생성 API
router.post("/create-character", authenticateToken, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "캐릭터 명을 입력해주세요." });
  }

  try {
    const existingCharacter = await prisma.character.findUnique({
      where: { name },
    });

    if (existingCharacter) {
      return res.status(409).json({ error: "이미 존재하는 캐릭터 명입니다." });
    }

    const defaultStats = {
      health: 500,
      power: 100,
      money: 10000,
    };

    const newCharacter = await prisma.character.create({
      data: {
        name,
        health: defaultStats.health,
        power: defaultStats.power,
        money: defaultStats.money,
        accountId: req.user.userId,
      },
    });

    res.status(201).json({
      message: "캐릭터가 성공적으로 생성되었습니다.",
      characterId: newCharacter.id,
    });
  } catch (error) {
    console.error("캐릭터 생성 중 오류 발생:", error);
    res.status(500).json({ error: "캐릭터 생성 중 오류가 발생했습니다." });
  }
});

export default router;
