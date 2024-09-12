import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middlewares/authMiddleware.js"; // JWT 인증 미들웨어

const router = express.Router();
const prisma = new PrismaClient();

// 아이템 생성 API
router.post("/create-item", authenticateToken, async (req, res) => {
  const { item_code, name, stat, price } = req.body;

  // 요청 데이터 유효성 검사
  if (!item_code || !name || !stat || !price) {
    return res.status(400).json({ error: "모든 필드를 입력해주세요." });
  }

  try {
    // 아이템 코드 중복 확인
    const existingItem = await prisma.shop.findUnique({
      where: { item_code },
    });

    if (existingItem) {
      return res
        .status(409)
        .json({ error: "이미 존재하는 아이템 코드입니다." });
    }

    // 아이템 생성
    const newItem = await prisma.shop.create({
      data: {
        item_code,
        name,
        health: stat.health || 0, // stat에서 health 추출, 기본값 0
        power: stat.power || 0, // stat에서 power 추출, 기본값 0
        price,
      },
    });

    // 성공적으로 생성된 아이템 정보 반환
    res.status(201).json({
      message: "아이템이 성공적으로 생성되었습니다.",
      item: {
        id: newItem.id,
        item_code: newItem.item_code,
        name: newItem.name,
        health: newItem.health,
        power: newItem.power,
        price: newItem.price,
      },
    });
  } catch (error) {
    console.error("아이템 생성 중 오류 발생:", error);
    res.status(500).json({ error: "아이템 생성 중 오류가 발생했습니다." });
  }
});

// 아이템 수정 API
router.patch("/update-item/:item_code", authenticateToken, async (req, res) => {
  const { item_code } = req.params;
  const { item_name, item_stat } = req.body;

  // 요청 데이터 유효성 검사
  if (!item_name && !item_stat) {
    return res
      .status(400)
      .json({ error: "수정할 아이템 이름 또는 스탯을 입력해주세요." });
  }

  try {
    // 수정할 아이템이 존재하는지 확인
    const existingItem = await prisma.item.findUnique({
      where: { item_code: parseInt(item_code) },
    });

    if (!existingItem) {
      return res.status(404).json({ error: "존재하지 않는 아이템입니다." });
    }

    // 아이템 수정 (가격은 수정하지 않도록 처리)
    const updatedItem = await prisma.item.update({
      where: { item_code: parseInt(item_code) },
      data: {
        name: item_name || existingItem.name, // 이름 수정
        health:
          item_stat?.health !== undefined
            ? item_stat.health
            : existingItem.health, // 스탯 수정
        power:
          item_stat?.power !== undefined ? item_stat.power : existingItem.power, // 스탯 수정
        // price는 수정되지 않음
      },
    });

    // 수정된 아이템 정보 반환
    res.status(200).json({
      message: "아이템이 성공적으로 수정되었습니다.",
      item: {
        id: updatedItem.id,
        item_code: updatedItem.item_code,
        name: updatedItem.name,
        health: updatedItem.health,
        power: updatedItem.power,
        price: updatedItem.price, // 가격은 그대로
      },
    });
  } catch (error) {
    console.error("아이템 수정 중 오류 발생:", error);
    res.status(500).json({ error: "아이템 수정 중 오류가 발생했습니다." });
  }
});

// 아이템 목록 조회 API
router.get("/items", authenticateToken, async (req, res) => {
  try {
    // 모든 아이템을 조회 (item_code, name, price만 선택)
    const items = await prisma.item.findMany({
      select: {
        item_code: true,
        name: true,
        price: true,
      },
    });

    // 응답으로 아이템 목록 반환
    res.status(200).json(items);
  } catch (error) {
    console.error("아이템 목록 조회 중 오류 발생:", error);
    res.status(500).json({ error: "아이템 목록 조회 중 오류가 발생했습니다." });
  }
});

// 아이템 구매 API
router.post("/buy-items/:characterId", authenticateToken, async (req, res) => {
    const { characterId } = req.params;
    const itemsToBuy = req.body; // 구매할 아이템 목록 (item_code, count)
  
    try {
      // 1. 캐릭터 정보 확인
      const character = await prisma.character.findUnique({
        where: { id: parseInt(characterId) },
        include: { inventory: true }, // 캐릭터의 인벤토리 정보 포함
      });
  
      if (!character) {
        return res.status(404).json({ error: "존재하지 않는 캐릭터입니다." });
      }
  
      // 2. 총 구매 금액 계산 및 상점 아이템 유효성 확인
      let totalCost = 0;
      const itemDetails = [];
  
      for (const item of itemsToBuy) {
        const shopItem = await prisma.shop.findUnique({
          where: { item_code: item.item_code }, // 상점에서 판매되는 아이템 조회
        });
  
        if (!shopItem) {
          return res.status(400).json({ error: `존재하지 않는 아이템 코드: ${item.item_code}` });
        }
  
        // 각 아이템의 가격에 수량을 곱해 총 비용 계산
        const itemCost = shopItem.price * item.count;
        totalCost += itemCost;
  
        // 복사될 아이템 정보 저장
        itemDetails.push({
          name: shopItem.name,
          item_code: shopItem.item_code,
          price: shopItem.price,
          health: shopItem.health,
          power: shopItem.power,
          count: item.count, // 구매 수량
        });
      }
  
      // 3. 게임 머니가 충분한지 확인
      if (totalCost > character.money) {
        return res.status(400).json({ error: "게임 머니가 부족합니다." });
      }
  
      // 4. 트랜잭션으로 게임 머니 차감 및 아이템 복사 후 인벤토리에 추가
      const remainingMoney = character.money - totalCost; // 남은 게임 머니 계산
  
      await prisma.$transaction(async (prisma) => {
        // 4.1. 캐릭터의 게임 머니 차감
        await prisma.character.update({
          where: { id: parseInt(characterId) },
          data: {
            money: remainingMoney, // 차감된 게임 머니 저장
          },
        });
        
        // 4.2. 아이템 복사 후 인벤토리에 추가 (각 아이템을 수량만큼 추가)
        for (const item of itemDetails) {
          const existingItem = await prisma.item.findFirst({
            where: {
              item_code: item.item_code,
              inventoryId: character.inventoryId, // 캐릭터의 인벤토리에서 아이템 검색
            },
          });
  
          if (existingItem) {
            // 이미 존재하는 아이템이면 수량 업데이트
            await prisma.item.update({
              where: { id: existingItem.id },
              data: {
                count: existingItem.count + item.count, // 수량 업데이트
              },
            });
          } else {
            // 존재하지 않는 아이템이면 새로 추가
            await prisma.item.create({
              data: {
                item_code: item.item_code, // 상점의 아이템 코드 복사
                name: item.name,
                price: item.price, // 가격 복사
                health: item.health, // 스탯 복사
                power: item.power,
                count: item.count, // 구매 수량 저장
                inventory: { connect: { id: character.inventoryId } }, // 캐릭터의 인벤토리에 연결
              },
            });
          }
        }
      });
  
      // 5. 남은 게임 머니 반환
      res.status(200).json({
        message: "아이템 구매가 성공적으로 완료되었습니다.",
        remainingMoney: remainingMoney,  // 남은 돈 반환
      });
  
    } catch (error) {
      console.error("아이템 구입 중 오류 발생:", error);
      res.status(500).json({ error: "아이템 구입 중 오류가 발생했습니다." });
    }
  });
  

// 아이템 판매 API
router.post("/sell-items/:characterId", authenticateToken, async (req, res) => {
    const { characterId } = req.params;
    const itemsToSell = req.body; // 판매할 아이템 목록 (item_code, count)
  
    try {
      // 1. 캐릭터 정보 확인
      const character = await prisma.character.findUnique({
        where: { id: parseInt(characterId) },
        include: { inventory: true }, // 캐릭터의 인벤토리 포함
      });
  
      if (!character) {
        return res.status(404).json({ error: "존재하지 않는 캐릭터입니다." });
      }
  
      // 2. 총 판매 금액 계산 및 판매 가능 여부 확인
      let totalSaleAmount = 0;
      const itemsToUpdate = [];
  
      for (const item of itemsToSell) {
        const inventoryItem = await prisma.item.findFirst({
          where: {
            item_code: item.item_code,
            inventoryId: character.inventoryId,
            equippedId: null // 장착 중인 아이템은 판매할 수 없음
          },
        });
  
        if (!inventoryItem) {
          return res.status(400).json({ error: `인벤토리에 없는 아이템 코드이거나, 장착 중인 아이템은 팔 수 없습니다: ${item.item_code}` });
        }
  
        // 판매하려는 수량이 인벤토리에 있는 수량보다 많은지 확인
        if (inventoryItem.count < item.count) {
          return res.status(400).json({ error: `아이템 수량이 부족합니다: ${item.item_code}` });
        }
  
        // 아이템 가격의 60%로 계산
        const salePrice = Math.floor(inventoryItem.price * 0.6) * item.count;
        totalSaleAmount += salePrice;
  
        // 판매할 아이템 업데이트 정보 저장 (수량 차감 또는 삭제)
        itemsToUpdate.push({
          id: inventoryItem.id,
          newCount: inventoryItem.count - item.count,
        });
      }
  
      // 3. 트랜잭션으로 게임 머니 증가 및 아이템 수량 업데이트
      await prisma.$transaction(async (prisma) => {
        // 3.1. 게임 머니 증가
        await prisma.character.update({
          where: { id: parseInt(characterId) },
          data: {
            money: character.money + totalSaleAmount, // 게임 머니 증가
          },
        });
  
        // 3.2. 아이템 수량 업데이트 또는 삭제
        for (const item of itemsToUpdate) {
          if (item.newCount > 0) {
            // 아이템 수량이 남으면 수량 업데이트
            await prisma.item.update({
              where: { id: item.id },
              data: { count: item.newCount },
            });
          } else {
            // 아이템 수량이 0이면 인벤토리에서 삭제
            await prisma.item.delete({
              where: { id: item.id },
            });
          }
        }
      });
  
      // 4. 남은 게임 머니 반환
      const updatedCharacter = await prisma.character.findUnique({
        where: { id: parseInt(characterId) },
        select: { money: true },
      });
  
      res.status(200).json({
        message: "아이템 판매가 성공적으로 완료되었습니다.",
        remainingMoney: updatedCharacter.money, // 남은 게임 머니 반환
      });
    } catch (error) {
      console.error("아이템 판매 중 오류 발생:", error);
      res.status(500).json({ error: "아이템 판매 중 오류가 발생했습니다." });
    }
  });


  router.post("/equip-item/:characterId", authenticateToken, async (req, res) => {
    const { characterId } = req.params;
    const { item_code } = req.body; // 장착할 아이템 코드
  
    try {
      // 1. 캐릭터 정보 확인
      const character = await prisma.character.findUnique({
        where: { id: parseInt(characterId) },
        include: { equipped: true, inventory: true }, // 장착 및 인벤토리 정보 포함
      });
  
      if (!character) {
        return res.status(404).json({ error: "존재하지 않는 캐릭터입니다." });
      }
  
      // 2. 인벤토리에 있는지 확인
      const inventoryItem = await prisma.item.findFirst({
        where: {
          item_code: item_code,
          inventoryId: character.inventoryId,
          equippedId: null // 이미 장착된 아이템은 조회되지 않음
        },
      });
  
      if (!inventoryItem) {
        return res.status(400).json({ error: `해당 아이템은 인벤토리에 없습니다: ${item_code}` });
      }
  
      // 3. 이미 장착된 아이템인지 확인
      const equippedItem = await prisma.item.findFirst({
        where: {
          item_code: item_code,
          equippedId: character.equippedId,
        },
      });
  
      if (equippedItem) {
        return res.status(400).json({ error: "이미 장착된 아이템입니다." });
      }
  
      // 4. 캐릭터 스탯 변경 (아이템의 스탯을 캐릭터 스탯에 더함)
      const newHealth = character.health + inventoryItem.health;
      const newPower = character.power + inventoryItem.power;
  
      // 5. 트랜잭션으로 아이템 장착, 스탯 업데이트, 인벤토리에서 아이템 처리
      await prisma.$transaction(async (prisma) => {
        // 5.1. 캐릭터 스탯 업데이트
        await prisma.character.update({
          where: { id: parseInt(characterId) },
          data: {
            health: newHealth,
            power: newPower,
          },
        });
  
        // 5.2. 아이템 장착 (equipped 테이블에 추가)
        await prisma.item.update({
          where: { id: inventoryItem.id },
          data: {
            equippedId: character.equippedId, // 아이템을 장착 정보에 추가
            inventoryId: null, // 인벤토리에서 제거
          },
        });
  
        // 5.3. 인벤토리에서 아이템 처리
        if (inventoryItem.count > 1) {
          // 수량이 2개 이상일 경우 수량 감소
          await prisma.item.update({
            where: { id: inventoryItem.id },
            data: { count: inventoryItem.count - 1 },
          });
        } else {
          // 수량이 1개일 경우 아이템 삭제
          await prisma.item.delete({
            where: { id: inventoryItem.id },
          });
        }
      });
  
      res.status(200).json({
        message: "아이템이 성공적으로 장착되었습니다.",
        newHealth: newHealth,
        newPower: newPower,
      });
  
    } catch (error) {
      console.error("아이템 장착 중 오류 발생:", error);
      res.status(500).json({ error: "아이템 장착 중 오류가 발생했습니다." });
    }
  });

  // 아이템 탈착 API
router.post("/unequip-item/:characterId", authenticateToken, async (req, res) => {
    const { characterId } = req.params;
    const { item_code } = req.body; // 탈착할 아이템 코드
  
    try {
      // 1. 캐릭터 정보 확인
      const character = await prisma.character.findUnique({
        where: { id: parseInt(characterId) },
        include: { equipped: true, inventory: true }, // 장착 및 인벤토리 정보 포함
      });
  
      if (!character) {
        return res.status(404).json({ error: "존재하지 않는 캐릭터입니다." });
      }
  
      // 2. 장착된 아이템인지 확인
      const equippedItem = await prisma.item.findFirst({
        where: {
          item_code: item_code,
          equippedId: character.equippedId,
        },
      });
  
      if (!equippedItem) {
        return res.status(400).json({ error: "장착되어 있지 않은 아이템입니다." });
      }
  
      // 3. 캐릭터 스탯 변경 (아이템의 스탯을 캐릭터 스탯에서 뺌)
      const newHealth = character.health - equippedItem.health;
      const newPower = character.power - equippedItem.power;
  
      // 4. 트랜잭션으로 아이템 탈착, 스탯 업데이트, 인벤토리에 아이템 추가 또는 수량 증가
      await prisma.$transaction(async (prisma) => {
        // 4.1. 캐릭터 스탯 업데이트
        await prisma.character.update({
          where: { id: parseInt(characterId) },
          data: {
            health: newHealth,
            power: newPower,
          },
        });
  
        // 4.2. 장착 해제 (equipped 테이블에서 삭제)
        await prisma.item.update({
          where: { id: equippedItem.id },
          data: {
            equippedId: null, // 장착 해제
            inventoryId: character.inventoryId, // 인벤토리로 이동
          },
        });
  
        // 4.3. 인벤토리에서 해당 아이템이 이미 있는지 확인
        const inventoryItem = await prisma.item.findFirst({
          where: {
            item_code: item_code,
            inventoryId: character.inventoryId,
          },
        });
  
        if (inventoryItem) {
          // 인벤토리에 이미 같은 아이템이 있으면 수량을 증가
          await prisma.item.update({
            where: { id: inventoryItem.id },
            data: {
              count: inventoryItem.count + 1,
            },
          });
        } else {
          // 인벤토리에 없으면 새로 추가
          await prisma.item.create({
            data: {
              item_code: equippedItem.item_code,
              name: equippedItem.name,
              price: equippedItem.price,
              health: equippedItem.health,
              power: equippedItem.power,
              count: 1,
              inventoryId: character.inventoryId,
            },
          });
        }
      });
  
      res.status(200).json({
        message: "아이템이 성공적으로 탈착되었습니다.",
        newHealth: newHealth,
        newPower: newPower,
      });
  
    } catch (error) {
      console.error("아이템 탈착 중 오류 발생:", error);
      res.status(500).json({ error: "아이템 탈착 중 오류가 발생했습니다." });
    }
  });

export default router;
