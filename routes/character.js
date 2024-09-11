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
    // 캐릭터 이름 중복 확인
    const existingCharacter = await prisma.character.findUnique({
      where: { name },
    });

    if (existingCharacter) {
      return res.status(409).json({ error: "이미 존재하는 캐릭터 명입니다." });
    }

    // 기본 스탯 설정
    const defaultStats = {
      health: 500,
      power: 100,
      money: 10000,
    };

    // 트랜잭션으로 캐릭터와 관련 데이터를 안전하게 생성
    const newCharacter = await prisma.$transaction(async (prisma) => {
      // 1. 캐릭터 생성
      const character = await prisma.character.create({
        data: {
          name,
          health: defaultStats.health,
          power: defaultStats.power,
          money: defaultStats.money,
          accountId: req.user.userId, // JWT에서 추출한 사용자 ID로 계정 연결
        },
      });

      // 2. 생성된 캐릭터 ID로 equipped와 inventory 생성
      const equipped = await prisma.equipped.create({
        data: {
          characterId: character.id,  // 생성된 캐릭터의 ID로 연결
        },
      });

      const inventory = await prisma.inventory.create({
        data: {
          characterId: character.id,  // 생성된 캐릭터의 ID로 연결
        },
      });

      // 캐릭터 생성 완료
      return character;
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

// 캐릭터 삭제 API
router.delete("/:id", authenticateToken, async (req, res) => {
    const characterId = parseInt(req.params.id);  // URI에서 캐릭터 ID를 가져옴
    const userId = req.user.userId;  // JWT에서 추출한 사용자 ID
  
    try {
      // 1. 삭제할 캐릭터가 존재하는지 확인
      const character = await prisma.character.findUnique({
        where: { id: characterId },
      });
  
      if (!character) {
        return res.status(404).json({ error: "존재하지 않는 캐릭터입니다." });
      }
  
      // 2. 캐릭터가 로그인한 사용자의 캐릭터인지 확인
      if (character.accountId !== userId) {
        return res.status(403).json({ error: "자신의 캐릭터만 삭제할 수 있습니다." });
      }
  
      // 3. 캐릭터 삭제 (관련된 equipped 및 inventory도 자동으로 삭제됨)
      await prisma.character.delete({
        where: { id: characterId },
      });
  
      res.status(200).json({ message: "캐릭터가 성공적으로 삭제되었습니다." });
    } catch (error) {
      console.error("캐릭터 삭제 중 오류 발생:", error);
      res.status(500).json({ error: "캐릭터 삭제 중 오류가 발생했습니다." });
    }
  });


export default router;
