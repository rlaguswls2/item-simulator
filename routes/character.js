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
            account: {
                    connect: { id: req.user.userId }, // 수동으로 Account 연결
                },
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

        // 3. 캐릭터의 equippedId와 inventoryId를 업데이트하여 연결
        const updatedCharacter = await prisma.character.update({
            where: { id: character.id },
            data: {
                equippedId: equipped.id, // 장비 ID 연결
                inventoryId: inventory.id, // 인벤토리 ID 연결
            },
        });

        return updatedCharacter;
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

  // 캐릭터 조회 API
router.get("/:id", authenticateToken, async (req, res) => {
    const characterId = parseInt(req.params.id);
    const userId = req.user ? req.user.userId : null; // JWT로부터 추출된 userId (로그인된 경우만 존재)
  
    try {
      // 조회할 캐릭터 정보 가져오기
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        select: {
          name: true,
          health: true,
          power: true,
          money: true, // 소유자인 경우에만 반환할 필드
          accountId: true, // 소유자 확인을 위해 accountId 가져오기
        },
      });
  
      if (!character) {
        return res.status(404).json({ error: "존재하지 않는 캐릭터입니다." });
      }
  
      // 캐릭터가 로그인한 사용자의 소유인지 확인
      if (userId && character.accountId === userId) {
        // 본인의 캐릭터일 경우, money 포함하여 반환
        return res.status(200).json({
          name: character.name,
          health: character.health,
          power: character.power,
          money: character.money,
        });
      } else {
        // 다른 사람의 캐릭터이거나 로그인하지 않은 경우
        return res.status(200).json({
          name: character.name,
          health: character.health,
          power: character.power,
        });
      }
    } catch (error) {
      console.error("캐릭터 조회 중 오류 발생:", error);
      res.status(500).json({ error: "캐릭터 조회 중 오류가 발생했습니다." });
    }
});

  // 캐릭터 인벤토리 내 아이템 목록 조회 API
router.get("/inventory/:characterId", authenticateToken, async (req, res) => {
    const { characterId } = req.params;
  
    try {
      // 1. 캐릭터 조회
      const character = await prisma.character.findUnique({
        where: { id: parseInt(characterId) },
        include: {
          inventory: {
            include: {
              items: true, // 인벤토리에 속한 아이템 포함
            },
          },
        },
      });
  
      if (!character) {
        return res.status(404).json({ error: "존재하지 않는 캐릭터입니다." });
      }
  
      // 2. 인벤토리에서 아이템 목록을 가져옴
      const items = character.inventory?.items.map(item => ({
        item_code: item.item_code,
        item_name: item.name,
        count: item.count,
      })) || [];
  
      // 3. 응답
      res.status(200).json(items);
  
    } catch (error) {
      console.error("아이템 목록 조회 중 오류 발생:", error);
      res.status(500).json({ error: "아이템 목록 조회 중 오류가 발생했습니다." });
    }
});
    
  
// 캐릭터가 장착한 아이템 목록 조회 API
router.get("/equipped/:characterId", async (req, res) => {
    const { characterId } = req.params;
  
    try {
      // 1. 캐릭터 조회 (장착한 아이템 포함)
      const character = await prisma.character.findUnique({
        where: { id: parseInt(characterId) },
        include: {
          equipped: {
            include: {
              items: true, // 장착된 아이템 포함
            },
          },
        },
      });
  
      if (!character) {
        return res.status(404).json({ error: "존재하지 않는 캐릭터입니다." });
      }
  
      // 2. 장착된 아이템 목록 구성
      const equippedItems = character.equipped?.items.map(item => ({
        item_code: item.item_code,
        item_name: item.name,
      })) || [];
  
      // 3. 응답
      res.status(200).json(equippedItems);
  
    } catch (error) {
      console.error("장착된 아이템 목록 조회 중 오류 발생:", error);
      res.status(500).json({ error: "장착된 아이템 목록 조회 중 오류가 발생했습니다." });
    }
});

export default router;
