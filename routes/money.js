import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middlewares/authMiddleware.js'; // JWT 인증 미들웨어

const router = express.Router();
const prisma = new PrismaClient();

// 게임 머니를 버는 API
router.post("/:characterId", authenticateToken, async (req, res) => {
  const { characterId } = req.params;

  try {
    // 1. 캐릭터 정보 조회
    const character = await prisma.character.findUnique({
      where: { id: parseInt(characterId) },
    });

    if (!character) {
      return res.status(404).json({ error: "존재하지 않는 캐릭터입니다." });
    }

    // 2. 게임 머니를 100원 증가시킴
    const updatedCharacter = await prisma.character.update({
      where: { id: parseInt(characterId) },
      data: {
        money: character.money + 100, // 100원 추가
      },
      select: { money: true }, // 변경된 게임 머니만 반환
    });

    // 3. 변경된 게임 머니 반환
    res.status(200).json({
      message: "게임 머니가 성공적으로 추가되었습니다.",
      updatedMoney: updatedCharacter.money,
    });

  } catch (error) {
    console.error("게임 머니 추가 중 오류 발생:", error);
    res.status(500).json({ error: "게임 머니 추가 중 오류가 발생했습니다." });
  }
});

export default router;
